import { moduleSchemas, ModuleType, type PropSchema } from "@blibliki/engine";
import {
  inputsFor,
  type IOKind,
  type IRoute,
  type IVideoModule,
  outputsFor,
  videoModuleSchemas,
  VideoModuleType,
} from "@blibliki/video-engine";

type VideoConnection = {
  source: string | null;
  sourceHandle?: string | null;
  target: string | null;
  targetHandle?: string | null;
};

type AudioModuleInfo = { id: string; name: string; moduleType: ModuleType };

type Range = { min: number; max: number; exp?: number };

const UNIT: Range = { min: 0, max: 1 };

function portKind(
  modules: IVideoModule[],
  moduleId: string,
  ioName: string,
  side: "input" | "output",
): IOKind | undefined {
  const module = modules.find((m) => m.id === moduleId);
  if (!module) return;
  const ports =
    side === "input"
      ? inputsFor(module.moduleType)
      : outputsFor(module.moduleType);

  return ports.find((port) => port.name === ioName)?.kind;
}

export function validVideoConnection(
  connection: VideoConnection,
  modules: IVideoModule[],
): boolean {
  const { source, sourceHandle, target, targetHandle } = connection;
  if (!source || !sourceHandle || !target || !targetHandle) return false;
  if (source === target) return false;

  const out = portKind(modules, source, sourceHandle, "output");
  const inp = portKind(modules, target, targetHandle, "input");

  return out !== undefined && out === inp;
}

// An Audio Prop outputs the raw prop value, so its range is the audio prop's
// schema range; every other control output is 0..1.
function sourceRange(
  module: IVideoModule,
  audioModules: AudioModuleInfo[],
): Range {
  if (module.moduleType !== VideoModuleType.AudioProp) return UNIT;

  const { moduleId, prop } = module.props as { moduleId: string; prop: string };
  const audio = audioModules.find((m) => m.id === moduleId);
  if (!audio) return UNIT;
  const schema = (
    moduleSchemas[audio.moduleType] as Record<string, PropSchema>
  )[prop];
  if (schema?.kind !== "number") return UNIT;

  return { min: schema.min, max: schema.max, exp: schema.exp };
}

function targetRange(module: IVideoModule, prop: string): Range {
  const schema = videoModuleSchemas[module.moduleType][prop];

  return schema?.kind === "number" ? schema : UNIT;
}

// Builds the route a cable stands for. A control cable gets the default
// range: the source's natural range into the target prop's schema range.
export function videoRouteFromConnection(
  id: string,
  connection: VideoConnection,
  modules: IVideoModule[],
  audioModules: AudioModuleInfo[],
): IRoute {
  const { source, sourceHandle, target, targetHandle } = connection;
  if (!source || !sourceHandle || !target || !targetHandle) {
    throw Error("Some value is null");
  }

  const route: IRoute = {
    id,
    kind: portKind(modules, source, sourceHandle, "output") ?? "texture",
    source: { moduleId: source, ioName: sourceHandle },
    destination: { moduleId: target, ioName: targetHandle },
  };
  if (route.kind === "texture") return route;

  const from = modules.find((m) => m.id === source);
  const to = modules.find((m) => m.id === target);
  const input = from ? sourceRange(from, audioModules) : UNIT;
  const output = to ? targetRange(to, targetHandle) : UNIT;

  return {
    ...route,
    inMin: input.min,
    inMax: input.max,
    outMin: output.min,
    outMax: output.max,
    exp: input.exp,
  };
}
