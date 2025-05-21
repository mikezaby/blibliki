"use client";

import { Engine } from "@blibliki/engine";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { Connection, EdgeChange, Node, NodeChange } from "@xyflow/react";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import {
  onNodesChange as _onNodesChange,
  onEdgesChange as _onEdgesChange,
  onConnect as _onConnect,
  addNode as _addNode,
} from "@/components/Grid/gridNodesSlice";
import Patch, { IPatch } from "@/models/Patch";
import type { RootState, AppDispatch } from "@/store";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useFirebase() {
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const signInWithClerk = async () => {
      const auth = getAuth();
      const token = await getToken({ template: "integration_firebase" });
      if (!token) throw Error("Token is empty");
      await signInWithCustomToken(auth, token);
    };

    void signInWithClerk();
  }, [getToken, user?.id]);
}

export function usePatches(): IPatch[] {
  const [patches, setPatches] = useState<IPatch[]>([]);

  useEffect(() => {
    void Patch.all().then((data) => {
      setPatches(data.map((patch) => patch.serialize()));
    });
  }, []);

  return patches;
}

export function usePatch() {
  const { patch } = useAppSelector((state) => state.patch);
  const { isSignedIn, user } = useUser();

  const canCreate = isSignedIn && !patch.id;
  const canUpdate = patch && user && patch.userId === user.id;
  const canDelete = canUpdate;

  return { patch, canCreate, canUpdate, canDelete };
}

export const useAudioModule = (id: string) => {
  const audioModule = useAppSelector((state) =>
    modulesSelector.selectById(state, id),
  );

  if (!audioModule) return;

  return audioModule;
};

export function useGridNodes() {
  const dispatch = useAppDispatch();
  const { nodes, edges, viewport } = useAppSelector((state) => state.gridNodes);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => dispatch(_onNodesChange(changes)),
    [dispatch],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => dispatch(_onEdgesChange(changes)),
    [dispatch],
  );

  const onConnect = useCallback(
    (connection: Connection) => dispatch(_onConnect(connection)),
    [dispatch],
  );

  const addNode = useCallback(
    (node: Node) => dispatch(_addNode(node)),
    [dispatch],
  );

  const isValidConnection = useCallback((connection: Connection): boolean => {
    const { source, sourceHandle, target, targetHandle } = connection;
    if (!source || !sourceHandle || !target || !targetHandle) return false;

    return Engine.current.validRoute({
      source: { moduleId: source, ioName: sourceHandle },
      destination: { moduleId: target, ioName: targetHandle },
    });
  }, []);

  return {
    nodes,
    edges,
    viewport,
    addNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
  };
}

export enum ColorScheme {
  Light = "light",
  Dark = "dark",
}

export function useColorScheme() {
  const [color, setColor] = useState<ColorScheme>(ColorScheme.Light);

  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setColor(isDark ? ColorScheme.Dark : ColorScheme.Light);

    const onColorSchemeUpdate = (event: MediaQueryListEvent) => {
      setColor(event.matches ? ColorScheme.Dark : ColorScheme.Light);
    };

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", onColorSchemeUpdate);

    return () => {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", onColorSchemeUpdate);
    };
  }, []);

  return color;
}
