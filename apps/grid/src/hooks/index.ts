import {
  Engine,
  ModuleType,
  type ModuleTypeToStateMapping,
} from "@blibliki/engine";
import { IPatch, IInstrument, Patch, Instrument } from "@blibliki/models";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Connection, Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import { modulePropsSelector } from "@/components/AudioModule/modulePropsSlice";
import { moduleStateSelector } from "@/components/AudioModule/moduleStateSlice";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import type { ModuleProps } from "@/components/AudioModule/modulesSlice";
import {
  onNodesChange as _onNodesChange,
  onEdgesChange as _onEdgesChange,
  onConnect as _onConnect,
  addNode as _addNode,
} from "@/components/Grid/gridNodesSlice";
import type { RootState, AppDispatch } from "@/store";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export { ColorScheme, useColorScheme } from "./useColorScheme";
export {
  DEFAULT_GRID_THEME_PRESET,
  THEME_PRESET_ROOT_ATTRIBUTE,
  THEME_PRESET_STORAGE_KEY,
  useThemePreset,
  readStoredThemePreset,
  readThemePresetFromRoot,
  applyThemePresetToRoot,
} from "./useThemePreset";

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

export function useInstruments(): IInstrument[] {
  const [instruments, setInstruments] = useState<IInstrument[]>([]);

  useEffect(() => {
    void Instrument.all().then((data) => {
      setInstruments(data.map((instrument) => instrument.serialize()));
    });
  }, []);

  return instruments;
}

export function usePatch() {
  const { patch } = useAppSelector((state) => state.patch);
  const { isSignedIn, user } = useUser();

  const canCreate = !!(isSignedIn && !patch.id);
  const canUpdate = patch.userId === user?.id;
  const canDelete = canUpdate;

  return { patch, canCreate, canUpdate, canDelete };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type AudioModuleData = DistributiveOmit<ModuleProps, "state">;

export const areModulesEqualIgnoringState = (
  previous: ModuleProps | undefined,
  next: ModuleProps | undefined,
): boolean => {
  if (previous === next) return true;
  if (!previous || !next) return previous === next;

  const { state: _previousState, ...previousWithoutState } = previous;
  const { state: _nextState, ...nextWithoutState } = next;

  return shallowEqual(previousWithoutState, nextWithoutState);
};

export const selectModuleStateById = (state: RootState, id: string) =>
  moduleStateSelector.selectById(state, id)?.state;

const EMPTY_MODULE_STATE = Object.freeze({}) as Record<string, never>;

type ModuleStateCarrier = {
  moduleType: ModuleType;
  state?: ModuleProps["state"];
};

export function resolveModuleStateForType<T extends ModuleType>(
  audioModule: ModuleStateCarrier | undefined,
  moduleType: T,
): ModuleTypeToStateMapping[T] {
  if (audioModule?.moduleType !== moduleType) {
    return EMPTY_MODULE_STATE as unknown as ModuleTypeToStateMapping[T];
  }

  return (audioModule.state ??
    EMPTY_MODULE_STATE) as ModuleTypeToStateMapping[T];
}

export function useModuleState<T extends ModuleType>(
  id: string,
  moduleType: T,
) {
  return useAppSelector((state) => {
    const runtimeState = moduleStateSelector.selectById(state, id)?.state;

    const audioModule = {
      moduleType,
      state: runtimeState,
    };

    return resolveModuleStateForType(audioModule, moduleType);
  });
}

export const useAudioModule = (id: string): AudioModuleData | undefined => {
  const moduleInfo = useAppSelector((state) =>
    modulesSelector.selectById(state, id),
  );
  const props = useAppSelector(
    (state) => modulePropsSelector.selectById(state, id)?.props,
  );
  if (!moduleInfo || !props) return;

  return {
    ...moduleInfo,
    props,
  } as AudioModuleData;
};

export function useGridNodes() {
  const dispatch = useAppDispatch();
  const { nodes, edges, viewport } = useAppSelector((state) => state.gridNodes);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      dispatch(_onNodesChange(changes));
    },
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

  const isValidConnection = useCallback(
    (connection: Connection | Edge): boolean => {
      const { source, sourceHandle, target, targetHandle } = connection;
      if (!source || !sourceHandle || !target || !targetHandle) return false;

      return Engine.current.validRoute({
        source: { moduleId: source, ioName: sourceHandle },
        destination: { moduleId: target, ioName: targetHandle },
      });
    },
    [],
  );

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
