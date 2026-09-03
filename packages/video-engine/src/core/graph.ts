import { VideoModuleType } from "@/modules";
import { VideoModule } from "./Module";
import { Routes } from "./Routes";
import { PropSchema } from "./schema";

export type RenderPass = {
  moduleId: string;
  moduleType: VideoModuleType;
  // Texture input name to the module id feeding it, or null when unplugged.
  inputs: Record<string, string | null>;
  // Numeric uniforms, one per prop the shader can use. Prefixed u_ by the renderer.
  uniforms: Record<string, number>;
};

export type ResolveProps = (module: VideoModule) => Record<string, unknown>;

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

export function buildPasses(
  modules: Map<string, VideoModule>,
  routes: Routes,
  resolveProps: ResolveProps,
): RenderPass[] {
  const passes: RenderPass[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  const visit = (id: string) => {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`Video graph has a cycle at ${id}`);
    const module = modules.get(id);
    if (!module) return;

    visiting.add(id);
    const inputs: Record<string, string | null> = {};
    for (const ioName of module.inputs) {
      const sourceId = routes.sourceFor(id, ioName);
      inputs[ioName] = sourceId;
      if (sourceId !== null) visit(sourceId);
    }
    visiting.delete(id);
    done.add(id);

    passes.push({
      moduleId: id,
      moduleType: module.moduleType,
      inputs,
      uniforms: uniformsFor(resolveProps(module), module.schema),
    });
  };

  for (const module of modules.values()) {
    if (module.moduleType === VideoModuleType.Output) visit(module.id);
  }

  return passes;
}
