import { VideoModuleType } from "@/modules";
import { VideoModule } from "./Module";
import { Routes } from "./Routes";
import { VoiceLayout } from "./poly";
import { PropSchema } from "./schema";

export type RenderPass = {
  moduleId: string;
  moduleType: VideoModuleType;
  // Texture input name to the target feeding it, or null when unplugged.
  inputs: Record<string, string | null>;
  // Numeric uniforms, one per prop the shader can use. Prefixed u_ by the renderer.
  uniforms: Record<string, number>;
  // Set on the per-voice passes of a module carrying voices; each renders
  // to its own target.
  voice?: number;
  // Tiles the voices of the `in` input into this module's target instead of
  // running its shader.
  compose?: { voices: number; layout: VoiceLayout };
};

export type ResolveProps = (module: VideoModule) => Record<string, unknown>;

export const targetKey = (pass: RenderPass) =>
  pass.voice === undefined ? pass.moduleId : `${pass.moduleId}:${pass.voice}`;

// Targets a pass samples, so the renderer can recycle each after its last
// reader.
export function readsOf(pass: RenderPass): string[] {
  if (pass.compose) {
    const source = pass.inputs.in;
    if (source === null || source === undefined) return [];
    const { voices } = pass.compose;

    return Array.from({ length: voices }, (_, voice) => `${source}:${voice}`);
  }

  return Object.values(pass.inputs).filter(
    (key): key is string => key !== null,
  );
}

export function uniformsFor(
  props: Record<string, unknown>,
  schema: Record<string, PropSchema>,
): Record<string, number> {
  const uniforms: Record<string, number> = {};

  for (const [key, prop] of Object.entries(schema)) {
    const value = props[key];
    if (prop.kind === "number" && typeof value === "number") {
      uniforms[key] = value;
    } else if (prop.kind === "boolean") {
      uniforms[key] = value ? 1 : 0;
    } else if (prop.kind === "enum") {
      const options: (string | number)[] = prop.options;
      uniforms[key] = Math.max(0, options.indexOf(value as string | number));
    }
  }

  return uniforms;
}

// Voices flow down texture routes as in the audio engine. A module with
// voices renders once per voice, and so does every module after it. A mono
// input to a poly module feeds every voice; a narrower poly input wraps. A
// module that resolves to one voice with a poly input (Output, Layout)
// composes the voices into one texture.
export function buildPasses(
  modules: Map<string, VideoModule>,
  routes: Routes,
  resolveProps: ResolveProps,
): RenderPass[] {
  const passes: RenderPass[] = [];
  const voicings = new Map<string, number>();
  const visiting = new Set<string>();

  const widthOf = (sourceId: string | null) =>
    sourceId === null ? 1 : (voicings.get(sourceId) ?? 1);

  const visit = (id: string) => {
    if (voicings.has(id)) return;
    if (visiting.has(id)) throw new Error(`Video graph has a cycle at ${id}`);
    const module = modules.get(id);
    if (!module) return;

    visiting.add(id);
    const sources: Record<string, string | null> = {};
    for (const input of module.inputs) {
      if (input.kind !== "texture") continue;
      const sourceId = routes.sourceFor(id, input.name);
      sources[input.name] = sourceId;
      if (sourceId !== null) visit(sourceId);
    }
    visiting.delete(id);

    const props = resolveProps(module);
    const voices = module.voiceCount(
      props,
      Object.values(sources).map(widthOf),
    );
    voicings.set(id, voices);
    const { moduleType } = module;

    if (voices > 1) {
      const uniforms = uniformsFor(props, module.schema);
      for (let voice = 0; voice < voices; voice += 1) {
        const inputs: Record<string, string | null> = {};
        for (const [ioName, sourceId] of Object.entries(sources)) {
          const width = widthOf(sourceId);
          inputs[ioName] =
            sourceId !== null && width > 1
              ? `${sourceId}:${voice % width}`
              : sourceId;
        }
        passes.push({ moduleId: id, moduleType, inputs, uniforms, voice });
      }
      return;
    }

    const composed = widthOf(sources.in ?? null);
    if (composed > 1) {
      const layout = (props.layout as VoiceLayout | undefined) ?? "grid";
      passes.push({
        moduleId: id,
        moduleType,
        inputs: sources,
        uniforms: {},
        compose: { voices: composed, layout },
      });
      return;
    }

    passes.push({
      moduleId: id,
      moduleType,
      inputs: sources,
      uniforms: uniformsFor(props, module.schema),
    });
  };

  for (const module of modules.values()) {
    if (module.moduleType === VideoModuleType.Output) visit(module.id);
  }

  return passes;
}
