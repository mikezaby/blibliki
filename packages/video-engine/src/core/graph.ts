import { VideoModuleType } from "@/modules";
import { VideoModule } from "./Module";
import { Routes } from "./Routes";
import { resolveInstances, InstanceLayout } from "./instances";
import { PropSchema } from "./schema";

export type RenderPass = {
  moduleId: string;
  moduleType: VideoModuleType;
  // Texture input name to the target feeding it, or null when unplugged.
  inputs: Record<string, string | null>;
  // Numeric uniforms, one per prop the shader can use. Prefixed u_ by the renderer.
  uniforms: Record<string, number>;
  // Set on the per-instance passes of a module carrying instances; each renders
  // to its own target.
  instance?: number;
  // Tiles the instances of the `in` input into this module's target instead of
  // running its shader.
  compose?: { instances: number; layout: InstanceLayout };
};

export type ResolveProps = (
  module: VideoModule,
  instance: number,
) => Record<string, unknown>;

export const targetKey = (pass: RenderPass) =>
  pass.instance === undefined
    ? pass.moduleId
    : `${pass.moduleId}:${pass.instance}`;

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

// Instances flow down routes as in the audio engine (see resolveInstances). A
// module with instances renders once per instance, and so does every module after
// it, each instance reading the matching instance of its inputs and its own
// resolved props. A single input to an instanced module feeds every instance; a
// narrower instanced input wraps. A module that resolves to one instance with a
// instanced input (Output, Layout) composes the instances into one texture.
export function buildPasses(
  modules: Map<string, VideoModule>,
  routes: Routes,
  resolveProps: ResolveProps,
  instanceCounts: ReadonlyMap<string, number> = resolveInstances(
    modules,
    routes,
    (module) => resolveProps(module, 0),
  ),
): RenderPass[] {
  const passes: RenderPass[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  const widthOf = (sourceId: string | null) =>
    sourceId === null ? 1 : (instanceCounts.get(sourceId) ?? 1);

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

    const instances = instanceCounts.get(id) ?? 1;
    const { moduleType } = module;

    if (instances > 1) {
      for (let instance = 0; instance < instances; instance += 1) {
        const inputs: Record<string, string | null> = {};
        for (const [ioName, sourceId] of Object.entries(sources)) {
          const width = widthOf(sourceId);
          inputs[ioName] =
            sourceId !== null && width > 1
              ? `${sourceId}:${instance % width}`
              : sourceId;
        }
        const uniforms = uniformsFor(
          resolveProps(module, instance),
          module.schema,
        );
        passes.push({ moduleId: id, moduleType, inputs, uniforms, instance });
      }
      return;
    }

    const props = resolveProps(module, 0);
    const composed = widthOf(sources.in ?? null);
    if (composed > 1) {
      const layout = (props.layout as InstanceLayout | undefined) ?? "grid";
      passes.push({
        moduleId: id,
        moduleType,
        inputs: sources,
        uniforms: {},
        compose: { instances: composed, layout },
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
