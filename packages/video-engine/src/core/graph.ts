import { VideoModuleType } from "@/modules";
import { VideoModule } from "./Module";
import { Routes } from "./Routes";
import { InstanceLayout, resolveInstances } from "./instances";
import { PropSchema } from "./schema";

export type RenderPass = {
  moduleId: string;
  moduleType: VideoModuleType;
  // Target the pass writes: the module id, `<id>:<instance>` for one
  // instance of an instanced module, or `<id>:mix` for the grid an
  // instanced module is composed into for its single consumers.
  target: string;
  // Texture input name to the target feeding it, or null when unplugged.
  inputs: Record<string, string | null>;
  // Numeric uniforms, one per prop the shader can use. Prefixed u_ by the renderer.
  uniforms: Record<string, number>;
  instance?: number;
  // The renderer copies this pass's output to `<target>:prev` after drawing.
  keep?: boolean;
  // Tiles the instances of the `in` input into the target instead of
  // running a shader.
  compose?: { instances: number; layout: InstanceLayout };
};

export type ResolveProps = (
  module: VideoModule,
  instance: number,
) => Record<string, unknown>;

// Targets a pass samples, so the renderer can recycle each after its last
// reader.
export function readsOf(pass: RenderPass): string[] {
  if (pass.compose) {
    const source = pass.inputs.in;
    if (source === null || source === undefined) return [];
    const { instances } = pass.compose;

    return Array.from(
      { length: instances },
      (_, instance) => `${source}:${instance}`,
    );
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

// Every module runs as many times as its own `instances` prop says, as an
// audio module plays as many voices as its own setting. Instance i of a
// module reads instance i of an instanced input, wrapping around a narrower
// one; a single input feeds every instance. An instanced input to a single
// module is composed into a grid first, the texture analog of an audio
// mono input summing poly voices; Layout composes with its own layout
// instead.
export function buildPasses(
  modules: Map<string, VideoModule>,
  routes: Routes,
  resolveProps: ResolveProps,
  instanceCounts: ReadonlyMap<string, number> = resolveInstances(
    modules,
    (module) => resolveProps(module, 0),
  ),
): RenderPass[] {
  const passes: RenderPass[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const mixed = new Set<string>();

  const countOf = (sourceId: string | null) =>
    sourceId === null ? 1 : (instanceCounts.get(sourceId) ?? 1);

  const mix = (sourceId: string): string => {
    const target = `${sourceId}:mix`;
    const source = modules.get(sourceId);
    if (source && !mixed.has(sourceId)) {
      mixed.add(sourceId);
      passes.push({
        moduleId: sourceId,
        moduleType: source.moduleType,
        target,
        inputs: { in: sourceId },
        uniforms: {},
        compose: { instances: countOf(sourceId), layout: "grid" },
      });
    }

    return target;
  };

  const visit = (id: string) => {
    if (done.has(id)) return;
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
    done.add(id);

    const instances = countOf(id);
    const { moduleType } = module;

    if (instances > 1) {
      for (let instance = 0; instance < instances; instance += 1) {
        const inputs: Record<string, string | null> = {};
        for (const [ioName, sourceId] of Object.entries(sources)) {
          const width = countOf(sourceId);
          inputs[ioName] =
            sourceId !== null && width > 1
              ? `${sourceId}:${instance % width}`
              : sourceId;
        }
        passes.push({
          moduleId: id,
          moduleType,
          target: `${id}:${instance}`,
          inputs: { ...inputs, ...module.externalInputs(instance) },
          uniforms: uniformsFor(resolveProps(module, instance), module.schema),
          instance,
          ...(module.keepsOutput ? { keep: true } : {}),
        });
      }
      return;
    }

    const props = resolveProps(module, 0);
    const source = sources.in ?? null;
    if (
      moduleType === VideoModuleType.Layout &&
      source !== null &&
      countOf(source) > 1
    ) {
      passes.push({
        moduleId: id,
        moduleType,
        target: id,
        inputs: sources,
        uniforms: {},
        compose: {
          instances: countOf(source),
          layout: props.layout as InstanceLayout,
        },
      });
      return;
    }

    const inputs: Record<string, string | null> = {};
    for (const [ioName, sourceId] of Object.entries(sources)) {
      inputs[ioName] =
        sourceId !== null && countOf(sourceId) > 1 ? mix(sourceId) : sourceId;
    }
    passes.push({
      moduleId: id,
      moduleType,
      target: id,
      inputs: { ...inputs, ...module.externalInputs() },
      uniforms: uniformsFor(props, module.schema),
      ...(module.keepsOutput ? { keep: true } : {}),
    });
  };

  for (const module of modules.values()) {
    if (module.moduleType === VideoModuleType.Output) visit(module.id);
  }

  return passes;
}
