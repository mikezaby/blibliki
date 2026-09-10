import type { VideoModule } from "./Module";
import type { Routes } from "./Routes";
import { NumberProp } from "./schema";

// A texture module opts into voices by spreading these into its props and
// schema. The engine then renders the module, and everything after it,
// once per voice. See docs/adr/0006.
export type IPolyProps = { voices: number };

export const DEFAULT_POLY_PROPS: IPolyProps = { voices: 1 };

export const polyPropSchema: { voices: NumberProp } = {
  voices: {
    kind: "number",
    min: 1,
    max: 81,
    step: 1,
    label: "Voices",
    shortLabel: "voices",
  },
};

export function voicesProp(props: Record<string, unknown>): number {
  const voices = props.voices;
  return typeof voices === "number" ? Math.max(1, Math.round(voices)) : 1;
}

export const VOICE_LAYOUTS = ["grid", "strips"] as const;
export type VoiceLayout = (typeof VOICE_LAYOUTS)[number];

export type Rect = { x: number; y: number; width: number; height: number };

// Cell of voice `voiceNo` in unit coordinates, y up as in GL. Grid is the
// squarest layout that fits, filled row-major from the top left; strips are
// full-width rows from the top.
export function voiceRect(
  voiceNo: number,
  voices: number,
  layout: VoiceLayout,
): Rect {
  const cols = layout === "strips" ? 1 : Math.ceil(Math.sqrt(voices));
  const rows = Math.ceil(voices / cols);
  const col = voiceNo % cols;
  const row = Math.floor(voiceNo / cols);
  const width = 1 / cols;
  const height = 1 / rows;

  return { x: col * width, y: 1 - (row + 1) * height, width, height };
}

// Voice count of every module. Each module gets the widths of its texture
// inputs and of the control sources routed into it, so voices flow down
// routes of either kind.
// ponytail: a control feedback loop counts as mono where it closes.
export function resolveVoices(
  modules: ReadonlyMap<string, VideoModule>,
  routes: Routes,
  propsOf: (module: VideoModule) => Record<string, unknown>,
): Map<string, number> {
  const voicings = new Map<string, number>();
  const visiting = new Set<string>();

  const visit = (id: string): number => {
    const known = voicings.get(id);
    if (known !== undefined) return known;
    const module = modules.get(id);
    if (!module || visiting.has(id)) return 1;

    visiting.add(id);
    const inputVoices: number[] = [];
    for (const input of module.inputs) {
      if (input.kind !== "texture") continue;
      const sourceId = routes.sourceFor(id, input.name);
      if (sourceId !== null) inputVoices.push(visit(sourceId));
    }
    for (const route of routes.controlRoutesFor(id)) {
      inputVoices.push(visit(route.source.moduleId));
    }
    visiting.delete(id);

    const voices = module.voiceCount(propsOf(module), inputVoices);
    voicings.set(id, voices);

    return voices;
  };

  for (const id of modules.keys()) visit(id);

  return voicings;
}
