import { VideoEngine } from "./VideoEngine";
import { handleMessage } from "./handleMessage";
import { HostMessage, WorkerMessage } from "./protocol";
import { Renderer } from "./render/Renderer";
import { Views } from "./render/Views";

const engine = new VideoEngine();
const views = new Views();
let renderer: Renderer | null = null;
let frameHandle = 0;
let lastFrame = 0;
// Latest decoded frame per media key, kept so a renderer made after a
// stop gets them again; `pending` names the ones not uploaded yet.
const frames = new Map<string, ImageBitmap>();
const pending = new Set<string>();
let lastMedia = "";
let lastValuesAt = -Infinity;
const VALUES_INTERVAL_MS = 100;

function post(message: WorkerMessage) {
  const transfer =
    message.type === "spectrumBuffer" ? [message.bins.buffer] : [];
  self.postMessage(message, { transfer });
}

function fail(error: unknown) {
  post({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  });
}

function stop() {
  cancelAnimationFrame(frameHandle);
  renderer?.dispose();
  renderer = null;
}

function frame(now: number) {
  if (views.size === 0) {
    stop();
    return;
  }
  try {
    if (!renderer) {
      renderer = new Renderer(new OffscreenCanvas(1, 1));
      for (const key of frames.keys()) pending.add(key);
    }
    const { width, height } = views.renderSize();
    renderer.resize(width, height);
    for (const key of pending) {
      const bitmap = frames.get(key);
      if (bitmap) renderer.upload(key, bitmap);
    }
    pending.clear();
    const seconds = now / 1000;
    engine.tick({ now: seconds, dt: lastFrame ? seconds - lastFrame : 0 });
    lastFrame = seconds;
    renderer.render(engine.passes(), seconds);
    const media = engine.mediaState();
    const mediaJson = JSON.stringify(media);
    if (mediaJson !== lastMedia) {
      lastMedia = mediaJson;
      post({ type: "media", modules: media });
    }
    if (now - lastValuesAt >= VALUES_INTERVAL_MS) {
      lastValuesAt = now;
      post({ type: "values", values: engine.controlValues() });
    }
    for (const view of views.due(now)) {
      void createImageBitmap(renderer.canvas, {
        resizeWidth: view.width,
        resizeHeight: view.height,
      })
        .then((bitmap) => {
          view.ctx.transferFromImageBitmap(bitmap);
        })
        .catch(fail);
    }
    frameHandle = requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
    views.clear();
    post({ type: "viewsDropped" });
    stop();
  }
}

self.onmessage = (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "attachView":
        views.attach(
          message.id,
          message.canvas,
          message.width,
          message.height,
          message.maxFps,
        );
        cancelAnimationFrame(frameHandle);
        frameHandle = requestAnimationFrame(frame);
        post({ type: "ready" });
        return;
      case "resizeView":
        views.resize(message.id, message.width, message.height);
        return;
      case "detachView":
        views.detach(message.id);
        return;
      case "frame":
        frames.get(message.key)?.close();
        frames.set(message.key, message.bitmap);
        pending.add(message.key);
        return;
      default:
        handleMessage(engine, message).forEach(post);
    }
  } catch (error) {
    fail(error);
  }
};
