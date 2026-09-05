import { Engine, ModuleType } from "@blibliki/engine";
import { VideoEngineHost, type SpectrumSource } from "@blibliki/video-engine";
import type { IVideoPatch } from "@blibliki/video-engine";
import VideoWorker from "@blibliki/video-engine/worker?worker";
import { addNotification } from "@/notificationsSlice";

type HostStore = {
  getState: () => { videoPatch: IVideoPatch };
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: ReturnType<typeof addNotification>) => unknown;
};

let host: VideoEngineHost | null = null;
let hostEngineId = "";
let unsubscribe: (() => void) | null = null;

function readSpectra(engine: Engine) {
  return function* (): Iterable<SpectrumSource> {
    for (const module of engine.modules.values()) {
      if (module.moduleType === ModuleType.Spectrum) {
        yield { id: module.id, bins: module.getFrequencies() };
      }
    }
  };
}

// One host per audio engine. Nodes call this lazily, so the worker starts
// with the first Visuals node and follows the engine when a patch reloads.
export function ensureVideoHost(store: HostStore): VideoEngineHost {
  const engine = Engine.current;
  if (host && hostEngineId === engine.id) return host;
  disposeVideoHost();

  const created = new VideoEngineHost({
    patchSource: engine,
    createWorker: () => new VideoWorker(),
    readSpectrum: readSpectra(engine),
  });
  created.onError((message) => {
    store.dispatch(
      addNotification({ type: "error", title: "Video engine", message }),
    );
  });

  // ponytail: the whole patch is re-sent on every change; per-command
  // messages if a patch ever grows large enough for that to show.
  let last = store.getState().videoPatch;
  created.send({ type: "load", patch: last });
  unsubscribe = store.subscribe(() => {
    const next = store.getState().videoPatch;
    if (next === last) return;
    last = next;
    created.send({ type: "load", patch: next });
  });

  host = created;
  hostEngineId = engine.id;
  return created;
}

export function disposeVideoHost() {
  unsubscribe?.();
  unsubscribe = null;
  host?.dispose();
  host = null;
  hostEngineId = "";
}
