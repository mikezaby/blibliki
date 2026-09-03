import { Optional } from "@blibliki/utils";
import { ICreateVideoModule, IVideoModule, VideoModule } from "./core/Module";
import { IRoute, Routes } from "./core/Routes";
import { applyBindings, IBinding } from "./core/controls";
import { buildPasses, RenderPass } from "./core/graph";
import { createModule, VideoModuleType, VideoPropsMapping } from "./modules";

export type IVideoPatch = {
  modules: IVideoModule[];
  routes: IRoute[];
  bindings: IBinding[];
};

export class VideoEngine {
  readonly modules = new Map<string, VideoModule>();
  readonly routes = new Routes();
  readonly bindings = new Map<string, IBinding>();
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
    for (const [bindingId, binding] of this.bindings) {
      if (binding.moduleId === id) this.bindings.delete(bindingId);
    }
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

  addRoute(route: Optional<IRoute, "id">): IRoute {
    this.findModule(route.source.moduleId);
    this.findModule(route.destination.moduleId);

    return this.routes.addRoute(route);
  }

  removeRoute(id: string) {
    this.routes.removeRoute(id);
  }

  setBinding(binding: IBinding) {
    this.findModule(binding.moduleId);
    this.bindings.set(binding.id, binding);
  }

  removeBinding(id: string) {
    this.bindings.delete(id);
  }

  setControls(values: Record<string, number>) {
    for (const [name, value] of Object.entries(values)) {
      this.controls.set(name, value);
    }
  }

  passes(): RenderPass[] {
    const bindings = Array.from(this.bindings.values());

    return buildPasses(this.modules, this.routes, (module) =>
      applyBindings(
        module.props as Record<string, unknown>,
        bindings.filter((b) => b.moduleId === module.id),
        this.controls,
      ),
    );
  }

  serialize(): IVideoPatch {
    return {
      modules: Array.from(this.modules.values()).map((m) => m.serialize()),
      routes: this.routes.serialize(),
      bindings: Array.from(this.bindings.values()),
    };
  }

  load(patch: IVideoPatch) {
    this.modules.clear();
    this.routes.clear();
    this.bindings.clear();
    patch.modules.forEach((m) => this.addModule(m));
    patch.routes.forEach((r) => this.addRoute(r));
    patch.bindings.forEach((b) => {
      this.setBinding(b);
    });
  }
}
