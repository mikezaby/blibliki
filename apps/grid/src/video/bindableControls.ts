import { moduleSchemas, ModuleType, type PropSchema } from "@blibliki/engine";
import {
  type IPlug,
  type IVideoModule,
  outputsFor,
  VideoModuleType,
} from "@blibliki/video-engine";

export type BindableControl = {
  source: IPlug;
  label: string;
  min: number;
  max: number;
  exp?: number;
};

type AudioModuleInfo = { id: string; name: string; moduleType: ModuleType };

const UNIT = { min: 0, max: 1 };

// An Audio Prop outputs the raw prop value, so its range is the audio prop's
// schema range; every other control output is 0..1.
function rangeOf(
  module: IVideoModule,
  audioModules: AudioModuleInfo[],
): Pick<BindableControl, "min" | "max" | "exp"> {
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

export function bindableControls(
  videoModules: IVideoModule[],
  audioModules: AudioModuleInfo[],
  excludeId: string,
): BindableControl[] {
  const controls: BindableControl[] = [];

  for (const module of videoModules) {
    if (module.id === excludeId) continue;
    for (const output of outputsFor(module.moduleType)) {
      if (output.kind !== "control") continue;
      controls.push({
        source: { moduleId: module.id, ioName: output.name },
        label: `${module.name} · ${output.name}`,
        ...rangeOf(module, audioModules),
      });
    }
  }

  return controls;
}

export const plugKey = (plug: IPlug) => `${plug.moduleId}:${plug.ioName}`;

export function controlLabel(
  controls: BindableControl[],
  source: IPlug,
): string {
  return (
    controls.find((c) => plugKey(c.source) === plugKey(source))?.label ??
    plugKey(source)
  );
}
