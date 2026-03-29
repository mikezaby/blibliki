import type { Connection, XYPosition } from "@xyflow/react";
import {
  addModule,
  type AvailableModuleType,
  type ModuleSerializedProps,
  updateModule,
} from "@/components/AudioModule/modulesSlice";
import { onConnect, selectOnlyNodes } from "@/components/Grid/gridNodesSlice";
import type { AppDispatch, RootState } from "@/store";

const GRID_CLIPBOARD_PASTE_STEP = 48;
const GRID_CLIPBOARD_KIND = "blibliki-grid-clipboard";
const GRID_CLIPBOARD_VERSION = 1;

export const GRID_CLIPBOARD_MIME = "application/x-blibliki-grid-clipboard";
export const GRID_CLIPBOARD_TEXT_PREFIX = "blibliki:grid:";

export type GridClipboardModule = {
  originalId: string;
  name: string;
  moduleType: AvailableModuleType;
  props: ModuleSerializedProps;
  position: XYPosition;
  voices?: number;
};

export type GridClipboardRoute = {
  sourceModuleId: string;
  sourceHandle: string;
  targetModuleId: string;
  targetHandle: string;
};

export type GridClipboardSnapshot = {
  modules: GridClipboardModule[];
  routes: GridClipboardRoute[];
};

type ClipboardState = Pick<RootState, "gridNodes" | "modules" | "moduleProps">;
type ClipboardReader = Pick<DataTransfer, "getData">;
type ClipboardWriter = Pick<DataTransfer, "setData">;
type GridClipboardEnvelope = {
  kind: typeof GRID_CLIPBOARD_KIND;
  snapshot: GridClipboardSnapshot;
  version: typeof GRID_CLIPBOARD_VERSION;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGridClipboardModule(value: unknown): value is GridClipboardModule {
  if (!isRecord(value)) return false;
  if (typeof value.originalId !== "string") return false;
  if (typeof value.name !== "string") return false;
  if (typeof value.moduleType !== "string") return false;
  if (!("props" in value)) return false;
  if (!isRecord(value.position)) return false;
  if (typeof value.position.x !== "number") return false;
  if (typeof value.position.y !== "number") return false;
  if (
    "voices" in value &&
    value.voices !== undefined &&
    typeof value.voices !== "number"
  ) {
    return false;
  }

  return true;
}

function isGridClipboardRoute(value: unknown): value is GridClipboardRoute {
  if (!isRecord(value)) return false;

  return (
    typeof value.sourceModuleId === "string" &&
    typeof value.sourceHandle === "string" &&
    typeof value.targetModuleId === "string" &&
    typeof value.targetHandle === "string"
  );
}

function isGridClipboardSnapshot(
  value: unknown,
): value is GridClipboardSnapshot {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.modules) || !Array.isArray(value.routes))
    return false;

  return (
    value.modules.every((module) => isGridClipboardModule(module)) &&
    value.routes.every((route) => isGridClipboardRoute(route))
  );
}

function serializeGridClipboardSnapshot(
  snapshot: GridClipboardSnapshot,
): string {
  const envelope: GridClipboardEnvelope = {
    kind: GRID_CLIPBOARD_KIND,
    snapshot,
    version: GRID_CLIPBOARD_VERSION,
  };

  return JSON.stringify(envelope);
}

function parseGridClipboardSnapshot(
  serializedSnapshot: string,
): GridClipboardSnapshot | null {
  try {
    const envelope = JSON.parse(serializedSnapshot) as unknown;
    if (!isRecord(envelope)) return null;
    if (envelope.kind !== GRID_CLIPBOARD_KIND) return null;
    if (envelope.version !== GRID_CLIPBOARD_VERSION) return null;
    if (!isGridClipboardSnapshot(envelope.snapshot)) return null;

    return envelope.snapshot;
  } catch {
    return null;
  }
}

function hasMappedModuleIdReference(
  value: unknown,
  idMap: ReadonlyMap<string, string>,
): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => hasMappedModuleIdReference(entry, idMap));
  }

  if (!isRecord(value)) return false;

  return Object.entries(value).some(
    ([key, entry]) =>
      (key === "moduleId" && typeof entry === "string" && idMap.has(entry)) ||
      hasMappedModuleIdReference(entry, idMap),
  );
}

function getGridClipboardPasteOffset(pasteIteration: number): XYPosition {
  return {
    x: GRID_CLIPBOARD_PASTE_STEP * pasteIteration,
    y: GRID_CLIPBOARD_PASTE_STEP * pasteIteration,
  };
}

function getClipboardSelectionCenter(
  modules: GridClipboardModule[],
): XYPosition | null {
  if (modules.length === 0) return null;

  let minX = modules[0]!.position.x;
  let maxX = modules[0]!.position.x;
  let minY = modules[0]!.position.y;
  let maxY = modules[0]!.position.y;

  modules.slice(1).forEach((module) => {
    minX = Math.min(minX, module.position.x);
    maxX = Math.max(maxX, module.position.x);
    minY = Math.min(minY, module.position.y);
    maxY = Math.max(maxY, module.position.y);
  });

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

function getGridClipboardAnchorOffset(
  modules: GridClipboardModule[],
  anchorPosition: XYPosition,
): XYPosition | null {
  const selectionCenter = getClipboardSelectionCenter(modules);
  if (!selectionCenter) return null;

  return {
    x: anchorPosition.x - selectionCenter.x,
    y: anchorPosition.y - selectionCenter.y,
  };
}

function offsetPosition(position: XYPosition, offset: XYPosition): XYPosition {
  return {
    x: position.x + offset.x,
    y: position.y + offset.y,
  };
}

function toClipboardConnection(
  route: GridClipboardRoute,
  idMap: ReadonlyMap<string, string>,
): Connection | null {
  const source = idMap.get(route.sourceModuleId);
  const target = idMap.get(route.targetModuleId);

  if (!source || !target) return null;

  return {
    source,
    sourceHandle: route.sourceHandle,
    target,
    targetHandle: route.targetHandle,
  };
}

export function buildGridClipboardSnapshot(
  state: ClipboardState,
): GridClipboardSnapshot | null {
  const selectedNodes = state.gridNodes.nodes.filter((node) => node.selected);
  if (selectedNodes.length === 0) return null;

  const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
  const modules = selectedNodes.flatMap((node) => {
    const moduleInfo = state.modules.entities[node.id];
    const moduleProps = state.moduleProps.entities[node.id]?.props;
    if (!moduleInfo || moduleProps === undefined) return [];

    const clipboardModule: GridClipboardModule = {
      originalId: moduleInfo.id,
      name: moduleInfo.name,
      moduleType: moduleInfo.moduleType,
      props: structuredClone(moduleProps),
      position: structuredClone(node.position),
    };

    if ("voices" in moduleInfo && typeof moduleInfo.voices === "number") {
      clipboardModule.voices = moduleInfo.voices;
    }

    return [clipboardModule];
  });

  if (modules.length === 0) return null;

  const routes = state.gridNodes.edges.flatMap((edge) => {
    if (
      !selectedNodeIds.has(edge.source) ||
      !selectedNodeIds.has(edge.target)
    ) {
      return [];
    }

    if (!edge.sourceHandle || !edge.targetHandle) return [];

    return [
      {
        sourceModuleId: edge.source,
        sourceHandle: edge.sourceHandle,
        targetModuleId: edge.target,
        targetHandle: edge.targetHandle,
      },
    ];
  });

  return { modules, routes };
}

export function remapModuleIdsInClipboardValue<T>(
  value: T,
  idMap: ReadonlyMap<string, string>,
): T {
  return remapClipboardValue(value, idMap) as T;
}

function remapClipboardValue(
  value: unknown,
  idMap: ReadonlyMap<string, string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => remapClipboardValue(entry, idMap));
  }

  if (!isRecord(value)) return value;

  const nextValue: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, entry]) => {
    const nextEntry =
      key === "moduleId" && typeof entry === "string" && idMap.has(entry)
        ? idMap.get(entry)
        : remapClipboardValue(entry, idMap);

    nextValue[key] = nextEntry;
  });

  return nextValue;
}

export function writeGridClipboardSnapshotToDataTransfer(
  clipboardData: ClipboardWriter,
  snapshot: GridClipboardSnapshot,
): void {
  const serializedSnapshot = serializeGridClipboardSnapshot(snapshot);

  clipboardData.setData(GRID_CLIPBOARD_MIME, serializedSnapshot);
  clipboardData.setData(
    "text/plain",
    `${GRID_CLIPBOARD_TEXT_PREFIX}${serializedSnapshot}`,
  );
}

export function readGridClipboardSnapshotFromDataTransfer(
  clipboardData: ClipboardReader,
): GridClipboardSnapshot | null {
  const serializedSnapshot = clipboardData.getData(GRID_CLIPBOARD_MIME);
  const directSnapshot = parseGridClipboardSnapshot(serializedSnapshot);
  if (directSnapshot) return directSnapshot;

  const textFallback = clipboardData.getData("text/plain");
  if (!textFallback.startsWith(GRID_CLIPBOARD_TEXT_PREFIX)) return null;

  return parseGridClipboardSnapshot(
    textFallback.slice(GRID_CLIPBOARD_TEXT_PREFIX.length),
  );
}

export const pasteGridClipboardSnapshot =
  (
    snapshot: GridClipboardSnapshot,
    options?: { anchorPosition?: XYPosition; pasteIteration?: number },
  ) =>
  (dispatch: AppDispatch) => {
    if (snapshot.modules.length === 0) return new Map<string, string>();

    const pasteIteration = options?.pasteIteration ?? 1;
    const offset =
      (options?.anchorPosition &&
        getGridClipboardAnchorOffset(
          snapshot.modules,
          options.anchorPosition,
        )) ??
      getGridClipboardPasteOffset(pasteIteration);
    const idMap = new Map<string, string>();
    const pastedNodeIds: string[] = [];

    snapshot.modules.forEach((module) => {
      const nextId = dispatch(
        addModule({
          audioModule: {
            name: module.name,
            moduleType: module.moduleType,
            props: structuredClone(module.props),
            ...(module.voices !== undefined ? { voices: module.voices } : {}),
          },
          position: offsetPosition(module.position, offset),
        }),
      );

      idMap.set(module.originalId, nextId);
      pastedNodeIds.push(nextId);
    });

    snapshot.modules.forEach((module) => {
      const nextId = idMap.get(module.originalId);
      if (!nextId) return;

      if (!hasMappedModuleIdReference(module.props, idMap)) return;

      const remappedProps = remapModuleIdsInClipboardValue(module.props, idMap);

      dispatch(
        updateModule({
          id: nextId,
          moduleType: module.moduleType,
          changes: { props: remappedProps },
        }),
      );
    });

    snapshot.routes.forEach((route) => {
      const connection = toClipboardConnection(route, idMap);
      if (!connection) return;

      dispatch(onConnect(connection));
    });

    dispatch(selectOnlyNodes(pastedNodeIds));

    return idMap;
  };
