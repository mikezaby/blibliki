import type { IEngineSerialize } from "@blibliki/engine";
import type { IPatch } from "@blibliki/models";
import type { Edge, Node } from "@xyflow/react";

// The engine's serialize format (Engine.serialize / "Export Engine JSON") is
// { bpm, timeSignature, modules, routes } — no visual info. Grid patches (IPatch)
// carry gridNodes (positions + edges). This converts the former to the latter,
// auto-arranging modules into columns by signal depth so an imported engine patch
// is readable on the canvas. (timeSignature has no grid slot yet and is dropped.)

const COLUMN_WIDTH = 320;
const ROW_HEIGHT = 200;

export function isEnginePatch(value: unknown): value is IEngineSerialize {
  return (
    typeof value === "object" &&
    value !== null &&
    !("config" in value) &&
    "modules" in value &&
    "routes" in value
  );
}

export function enginePatchToGridPatch(
  engine: IEngineSerialize,
  name = "Imported patch",
): IPatch {
  const positions = autoLayout(engine);

  const nodes: Node[] = engine.modules.map((module) => ({
    id: module.id,
    type: "audioNode",
    position: positions.get(module.id) ?? { x: 0, y: 0 },
    data: {},
  }));

  const edges: Edge[] = engine.routes.map((route) => ({
    id: route.id,
    source: route.source.moduleId,
    sourceHandle: route.source.ioName,
    target: route.destination.moduleId,
    targetHandle: route.destination.ioName,
  }));

  return {
    id: "",
    userId: "",
    name,
    config: {
      bpm: engine.bpm,
      modules: engine.modules,
      gridNodes: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
    },
  };
}

// Column = longest incoming-route chain (sources on the left, sinks on the
// right); rows stack modules that share a column.
function autoLayout(
  engine: IEngineSerialize,
): Map<string, { x: number; y: number }> {
  const incoming = new Map<string, string[]>();
  for (const route of engine.routes) {
    const dest = route.destination.moduleId;
    const sources = incoming.get(dest) ?? [];
    sources.push(route.source.moduleId);
    incoming.set(dest, sources);
  }

  const depthCache = new Map<string, number>();
  const depthOf = (id: string, seen: Set<string>): number => {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    if (seen.has(id)) return 0; // cycle guard (feedback graphs)
    seen.add(id);
    const sources = incoming.get(id) ?? [];
    const depth =
      sources.length === 0
        ? 0
        : Math.max(...sources.map((source) => depthOf(source, seen) + 1));
    seen.delete(id);
    depthCache.set(id, depth);
    return depth;
  };

  const nextRow = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  for (const module of engine.modules) {
    const column = depthOf(module.id, new Set());
    const row = nextRow.get(column) ?? 0;
    nextRow.set(column, row + 1);
    positions.set(module.id, {
      x: column * COLUMN_WIDTH,
      y: row * ROW_HEIGHT,
    });
  }
  return positions;
}
