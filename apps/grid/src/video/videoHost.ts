import { Engine } from "@blibliki/engine";
import { VideoEngineHost } from "@blibliki/video-engine";
import type { IVideoPatch } from "@blibliki/video-engine";
import VideoWorker from "@blibliki/video-engine/worker?worker";
import { addNotification } from "@/notificationsSlice";
import { referencedAudioModules, SpectrumTaps } from "./spectrumTaps";

type HostStore = {
  getState: () => { videoPatch: IVideoPatch };
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: ReturnType<typeof addNotification>) => unknown;
};

let host: VideoEngineHost | null = null;
let taps: SpectrumTaps | null = null;
let hostEngineId = "";
let unsubscribe: (() => void) | null = null;

// One host per audio engine. Nodes call this lazily, so the worker starts
// with the first Visuals node and follows the engine when a patch reloads.
export function ensureVideoHost(store: HostStore): VideoEngineHost {
  const engine = Engine.current;
  if (host && hostEngineId === engine.id) return host;
  disposeVideoHost();

  const spectrumTaps = new SpectrumTaps(engine);
  const created = new VideoEngineHost({
    patchSource: engine,
    createWorker: () => new VideoWorker(),
    readSpectrum: () => spectrumTaps.read(),
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
  spectrumTaps.sync(referencedAudioModules(last.modules));
  unsubscribe = store.subscribe(() => {
    const next = store.getState().videoPatch;
    if (next === last) return;
    last = next;
    created.send({ type: "load", patch: next });
    spectrumTaps.sync(referencedAudioModules(next.modules));
  });

  host = created;
  taps = spectrumTaps;
  hostEngineId = engine.id;
  return created;
}

export function disposeVideoHost() {
  unsubscribe?.();
  unsubscribe = null;
  host?.dispose();
  host = null;
  // The engine may already be disposed with its modules; taps go with it.
  try {
    taps?.dispose();
  } catch {
    // ignore
  }
  taps = null;
  hostEngineId = "";
}
