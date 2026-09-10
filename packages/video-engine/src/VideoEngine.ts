import {
  Frame,
  ICreateVideoModule,
  IVideoModule,
  MidiNoteEvent,
  SpectrumFrame,
  VideoModule,
} from "./core/Module";
import { ICreateRoute, IRoute, Routes } from "./core/Routes";
import {
  applyControlRoutes,
  controlName,
  instanceControlName,
} from "./core/controls";
import { buildPasses, RenderPass } from "./core/graph";
import { resolveInstances } from "./core/instances";
import { PropSchema } from "./core/schema";
import { createModule, VideoModuleType, VideoPropsMapping } from "./modules";

export type IVideoPatch = {
  modules: IVideoModule[];
  routes: IRoute[];
};

export class VideoEngine {
  readonly modules = new Map<string, VideoModule>();
  readonly routes = new Routes();
  // Control values by "<moduleId>:<output>": audio prop mirrors pushed by
  // the host, and control module outputs written by tick.
  private controls = new Map<string, number>();
  // Raw bins per audio Spectrum module, copied because the host's buffer
  // goes back to it after every message. Band modules read these.
  readonly spectra = new Map<string, SpectrumFrame>();
  private instanceCounts: ReadonlyMap<string, number> = new Map();

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

  // A MIDI route may start at an audio module the host bridges (ADR 10);
  // its source is not checked here.
  addRoute(route: ICreateRoute): IRoute {
    const kind = route.kind ?? "texture";
    const destination = this.findModule(route.destination.moduleId);
    const target = route.destination.ioName;
    const accepts = destination.inputs.some(
      (input) => input.name === target && input.kind === kind,
    );
    if (!accepts) {
      throw new Error(`${destination.name} has no ${kind} input ${target}`);
    }

    const source = this.modules.get(route.source.moduleId);
    if (!source && kind === "midi") return this.routes.addRoute(route);
    if (!source) {
      throw new Error(`Video module not found: ${route.source.moduleId}`);
    }
    const output = source.outputs.find((o) => o.name === route.source.ioName);
    if (output?.kind !== kind) {
      throw new Error(
        `${source.name} has no ${kind} output ${route.source.ioName}`,
      );
    }

    return this.routes.addRoute(route);
  }

  removeRoute(id: string) {
    this.routes.removeRoute(id);
  }

  setSpectrum(moduleId: string, bins: Float32Array, sampleRate: number) {
    let frame = this.spectra.get(moduleId);
    if (frame?.bins.length !== bins.length) {
      frame = { bins: new Float32Array(bins.length), sampleRate };
      this.spectra.set(moduleId, frame);
    }
    frame.bins.set(bins);
    frame.sampleRate = sampleRate;
  }

  // A note the host bridged from an audio MIDI output into `moduleId`'s
  // MIDI input. A module removed while a note is in flight is skipped.
  midi(moduleId: string, ioName: string, event: MidiNoteEvent) {
    this.modules.get(moduleId)?.receiveMidi(ioName, event);
  }

  setControls(values: Record<string, number>) {
    for (const [name, value] of Object.entries(values)) {
      this.controls.set(name, value);
    }
  }

  // ponytail: modules tick in insertion order, so a chain of control modules
  // lags one frame per hop; sort by control routes when it matters.
  tick(clock: Pick<Frame, "now" | "dt">) {
    const frame: Frame = { ...clock, spectra: this.spectra };
    this.instanceCounts = this.resolveInstances();
    for (const module of this.modules.values()) {
      const instances = this.instanceCounts.get(module.id) ?? 1;
      for (let instance = 0; instance < instances; instance += 1) {
        const outputs = module.tick(
          this.controls,
          frame,
          this.resolveProps(module, instance),
          instance,
        );
        if (!outputs) break;
        for (const [name, value] of Object.entries(outputs)) {
          const key =
            instances > 1
              ? instanceControlName(module.id, name, instance)
              : controlName(module.id, name);
          this.controls.set(key, value);
        }
      }
    }
  }

  passes(): RenderPass[] {
    this.instanceCounts = this.resolveInstances();

    return buildPasses(
      this.modules,
      this.routes,
      (module, instance) => this.resolveProps(module, instance),
      this.instanceCounts,
    );
  }

  // The `instances` prop is resolved at instance 0, so an instanced control
  // drives the count with its first instance.
  private resolveInstances() {
    return resolveInstances(this.modules, (module) =>
      applyControlRoutes(
        module.props as Record<string, unknown>,
        this.routes.controlRoutesFor(module.id),
        this.controls,
        module.schema as Record<string, PropSchema>,
      ),
    );
  }

  private resolveProps(
    module: VideoModule,
    instance: number,
  ): Record<string, unknown> {
    return applyControlRoutes(
      module.props as Record<string, unknown>,
      this.routes.controlRoutesFor(module.id),
      this.controls,
      module.schema as Record<string, PropSchema>,
      instance,
      this.instanceCounts,
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
