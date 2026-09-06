import {
  FrameClock,
  ICreateVideoModule,
  IVideoModule,
  VideoModule,
} from "./core/Module";
import { ICreateRoute, IRoute, Routes } from "./core/Routes";
import { applyControlRoutes, controlName } from "./core/controls";
import { buildPasses, RenderPass } from "./core/graph";
import { PropSchema } from "./core/schema";
import { createModule, VideoModuleType, VideoPropsMapping } from "./modules";

export type IVideoPatch = {
  modules: IVideoModule[];
  routes: IRoute[];
};

export class VideoEngine {
  readonly modules = new Map<string, VideoModule>();
  readonly routes = new Routes();
  // Control values by "<moduleId>:<output>": audio prop mirrors and spectrum
  // bands pushed by the host, and control module outputs written by tick.
  private controls = new Map<string, number>();

  addModule<T extends VideoModuleType>(
    params: ICreateVideoModule<T>,
  ): VideoModule {
    const module = createModule(params);
    this.modules.set(module.id, module);

    return module;
  }

  removeModule(id: string) {
    this.modules.delete(id);
    this.routes.removeForModule(id);
  }

  findModule(id: string): VideoModule {
    const module = this.modules.get(id);
    if (!module) throw new Error(`Video module not found: ${id}`);

    return module;
  }

  updateProps<T extends VideoModuleType>(
    id: string,
    props: Partial<VideoPropsMapping[T]>,
  ) {
    (this.findModule(id) as VideoModule<T>).updateProps(props);
  }

  addRoute(route: ICreateRoute): IRoute {
    const kind = route.kind ?? "texture";
    const source = this.findModule(route.source.moduleId);
    const destination = this.findModule(route.destination.moduleId);

    const output = source.outputs.find((o) => o.name === route.source.ioName);
    if (output?.kind !== kind) {
      throw new Error(
        `${source.name} has no ${kind} output ${route.source.ioName}`,
      );
    }
    const target = route.destination.ioName;
    const accepts =
      kind === "texture"
        ? destination.inputs.includes(target)
        : (destination.schema as Record<string, { kind: string }>)[target]
            ?.kind === "number";
    if (!accepts) {
      throw new Error(`${destination.name} has no ${kind} input ${target}`);
    }

    return this.routes.addRoute(route);
  }

  removeRoute(id: string) {
    this.routes.removeRoute(id);
  }

  setControls(values: Record<string, number>) {
    for (const [name, value] of Object.entries(values)) {
      this.controls.set(name, value);
    }
  }

  // ponytail: modules tick in insertion order, so a chain of control modules
  // lags one frame per hop; sort by control routes when it matters.
  tick(frame: FrameClock) {
    for (const module of this.modules.values()) {
      const outputs = module.tick(this.controls, frame);
      if (!outputs) continue;
      for (const [name, value] of Object.entries(outputs)) {
        this.controls.set(controlName(module.id, name), value);
      }
    }
  }

  passes(): RenderPass[] {
    return buildPasses(this.modules, this.routes, (module) =>
      applyControlRoutes(
        module.props as Record<string, unknown>,
        this.routes.controlRoutesFor(module.id),
        this.controls,
        module.schema as Record<string, PropSchema>,
      ),
    );
  }

  serialize(): IVideoPatch {
    return {
      modules: Array.from(this.modules.values()).map((m) => m.serialize()),
      routes: this.routes.serialize(),
    };
  }

  // Patches saved before route kinds carry routes without `kind` (texture)
  // and a `bindings` list, which is ignored.
  load(patch: IVideoPatch) {
    this.modules.clear();
    this.routes.clear();
    patch.modules.forEach((m) => this.addModule(m));
    patch.routes.forEach((r) => this.addRoute(r));
  }
}
