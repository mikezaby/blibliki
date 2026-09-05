import { VideoEngine } from "./VideoEngine";
import { handleMessage } from "./handleMessage";
import { HostMessage, WorkerMessage } from "./protocol";
import { Renderer } from "./render/Renderer";

const engine = new VideoEngine();
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

function detach() {
  cancelAnimationFrame(frameHandle);
  renderer?.dispose();
  renderer = null;
}

function frame() {
  if (!renderer) return;
  try {
    renderer.render(engine.passes());
    frameHandle = requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
    detach();
  }
}

self.onmessage = (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "init":
        detach();
        renderer = new Renderer(message.canvas);
        renderer.resize(message.width, message.height);
        frameHandle = requestAnimationFrame(frame);
        post({ type: "ready" });
        return;
      case "resize":
        renderer?.resize(message.width, message.height);
        return;
      case "detach":
        detach();
        return;
      default:
        handleMessage(engine, message).forEach(post);
    }
  } catch (error) {
    fail(error);
  }
};
