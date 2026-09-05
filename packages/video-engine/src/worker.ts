import { VideoEngine } from "./VideoEngine";
import { handleMessage } from "./handleMessage";
import { HostMessage, WorkerMessage } from "./protocol";
import { Renderer } from "./render/Renderer";
import { Views } from "./render/Views";

const engine = new VideoEngine();
const views = new Views();
let renderer: Renderer | null = null;
let frameHandle = 0;

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
    renderer ??= new Renderer(new OffscreenCanvas(1, 1));
    const { width, height } = views.renderSize();
    renderer.resize(width, height);
    renderer.render(engine.passes());
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
      default:
        handleMessage(engine, message).forEach(post);
    }
  } catch (error) {
    fail(error);
  }
};
