import type { IAnyModuleSerialize, IRoute } from "@blibliki/engine";
import {
  createInstrumentEnginePatch,
  type InstrumentDocument,
} from "@blibliki/instrument";
import { Patch, type IInstrument } from "@blibliki/models";

const VIEWPORT = { x: 0, y: 0, zoom: 1 };
const SEED_X = 0;
const SEED_ROW_GAP = 48;

function createSeedNodes(modules: readonly IAnyModuleSerialize[]) {
  return modules.map((module, index) => ({
    id: module.id,
    type: "audioNode",
    position: { x: SEED_X, y: index * SEED_ROW_GAP },
    data: {},
  }));
}

function createGridEdges(routes: readonly IRoute[]) {
  return routes.map((route) => ({
    id: route.id,
    source: route.source.moduleId,
    sourceHandle: route.source.ioName,
    target: route.destination.moduleId,
    targetHandle: route.destination.ioName,
  }));
}

export function createInstrumentDebugPatch(instrument: IInstrument) {
  const document = instrument.document as InstrumentDocument;
  const runtimePatch = createInstrumentEnginePatch(document).patch;

  return Patch.build({
    name: `Debug: ${instrument.name}`,
    userId: instrument.userId,
    config: {
      bpm: runtimePatch.bpm,
      modules: runtimePatch.modules,
      gridNodes: {
        nodes: createSeedNodes(runtimePatch.modules),
        edges: createGridEdges(runtimePatch.routes),
        viewport: VIEWPORT,
      },
    },
  });
}
