import { Engine, ModuleType } from "@blibliki/engine";
import {
  type IVideoModule,
  type SpectrumSource,
  VideoModuleType,
} from "@blibliki/video-engine";

type TapEngine = Pick<
  Engine,
  "addModule" | "addRoute" | "removeRoute" | "removeModule" | "findModule"
>;

type Tap = { moduleId: string; routeId: string };

// What a tap needs from the engine's Spectrum module, which is not exported.
type Analyser = {
  getFrequencies: () => Float32Array;
  audioNode: { context: { sampleRate: number } };
};

export function referencedAudioModules(modules: IVideoModule[]): Set<string> {
  const ids = new Set<string>();
  for (const module of modules) {
    if (module.moduleType !== VideoModuleType.Band) continue;
    const { moduleId } = module.props as { moduleId: string };
    if (moduleId) ids.add(moduleId);
  }

  return ids;
}

// One hidden Spectrum module per audio module a Band references, tapped
// from its first audio output, shared by every Band on that module. Taps
// live only in the engine; the patch is saved from the store, so they are
// never persisted.
export class SpectrumTaps {
  private taps = new Map<string, Tap>();

  constructor(private engine: TapEngine) {}

  sync(referenced: Set<string>) {
    for (const [id, tap] of this.taps) {
      if (!referenced.has(id)) this.remove(id, tap);
    }
    for (const id of referenced) {
      if (!this.taps.has(id)) this.add(id);
    }
  }

  *read(): Iterable<SpectrumSource> {
    for (const [id, tap] of this.taps) {
      const spectrum = this.engine.findModule(
        tap.moduleId,
      ) as unknown as Analyser;
      yield {
        id,
        bins: spectrum.getFrequencies(),
        sampleRate: spectrum.audioNode.context.sampleRate,
      };
    }
  }

  dispose() {
    for (const [id, tap] of this.taps) this.remove(id, tap);
  }

  private add(id: string) {
    let output: string | undefined;
    try {
      output = this.engine
        .findModule(id)
        .outputs.collection.find((io) => io.isAudio())?.name;
    } catch {
      return;
    }
    if (!output) return;

    const tap = this.engine.addModule({
      name: `video tap ${id}`,
      moduleType: ModuleType.Spectrum,
      props: {},
    });
    const route = this.engine.addRoute({
      source: { moduleId: id, ioName: output },
      destination: { moduleId: tap.id, ioName: "in" },
    });
    this.taps.set(id, { moduleId: tap.id, routeId: route.id });
  }

  private remove(id: string, tap: Tap) {
    this.engine.removeRoute(tap.routeId);
    this.engine.removeModule(tap.moduleId);
    this.taps.delete(id);
  }
}
