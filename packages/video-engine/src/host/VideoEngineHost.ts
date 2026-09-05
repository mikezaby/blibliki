import { IVideoPatch } from "@/VideoEngine";
import { HostMessage, WorkerMessage } from "@/protocol";
import { PatchSource, propsToControls } from "./mirror";
import { openProjectorWindow, ProjectorWindow } from "./projectorWindow";

export type SpectrumSource = { id: string; bins: Float32Array };

export type VideoEngineHostOptions = {
  patchSource: PatchSource;
  createWorker: () => Worker;
  // Current frequency bins (dB) per Spectrum module. Arrays are copied
  // before transfer, so yielding the analyser's own buffer is fine.
  readSpectrum?: () => Iterable<SpectrumSource>;
};

const PROJECTOR_VIEW = "projector";

export class VideoEngineHost {
  private worker: Worker;
  private projector: ProjectorWindow | null = null;
  private spare = new Map<string, Float32Array>();
  private inFlight = new Set<string>();
  private views = new Set<string>();
  private frameHandle = 0;
  private disposed = false;
  private patchListeners = new Set<(patch: IVideoPatch) => void>();
  private errorListeners = new Set<(message: string) => void>();

  constructor(private options: VideoEngineHostOptions) {
    this.worker = options.createWorker();
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.receive(event.data);
    };

    const { patchSource } = options;
    const initial: Record<string, number> = {};
    for (const module of patchSource.serialize().modules) {
      Object.assign(initial, propsToControls(module.id, module.props));
    }
    this.send({ type: "controls", values: initial });

    // The engine has no way to remove a props callback, so guard on disposed.
    patchSource.onPropsUpdate((update) => {
      if (this.disposed) return;
      this.send({
        type: "controls",
        values: propsToControls(update.id, update.props),
      });
    });

    this.frameHandle = requestAnimationFrame(this.tick);
  }

  // The canvas is transferred; it must not have been drawn on and cannot be
  // attached twice. Callers create a fresh element per attach.
  attachView(id: string, canvas: HTMLCanvasElement, maxFps: number) {
    const offscreen = canvas.transferControlToOffscreen();
    this.views.add(id);
    this.send(
      {
        type: "attachView",
        id,
        canvas: offscreen,
        width: canvas.width,
        height: canvas.height,
        maxFps,
      },
      [offscreen],
    );
  }

  resizeView(id: string, width: number, height: number) {
    this.send({ type: "resizeView", id, width, height });
  }

  detachView(id: string) {
    this.views.delete(id);
    this.send({ type: "detachView", id });
  }

  // Returns false when the browser blocked the popup (call from a gesture).
  open(): boolean {
    if (this.projector && !this.projector.window.closed) {
      this.projector.window.focus();
      return true;
    }

    const projector = openProjectorWindow();
    if (!projector) return false;
    this.projector = projector;

    const { window: win, canvas } = projector;
    canvas.width = win.innerWidth;
    canvas.height = win.innerHeight;
    this.attachView(PROJECTOR_VIEW, canvas, 60);

    win.addEventListener("resize", () => {
      this.resizeView(PROJECTOR_VIEW, win.innerWidth, win.innerHeight);
    });
    win.addEventListener("pagehide", () => {
      this.detachView(PROJECTOR_VIEW);
      this.projector = null;
    });

    return true;
  }

  send(message: HostMessage, transfer: Transferable[] = []) {
    if (this.disposed) return;
    this.worker.postMessage(message, transfer);
  }

  onPatch(listener: (patch: IVideoPatch) => void) {
    this.patchListeners.add(listener);
    return () => this.patchListeners.delete(listener);
  }

  onError(listener: (message: string) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    this.projector?.window.close();
    this.projector = null;
    this.worker.terminate();
  }

  private receive(message: WorkerMessage) {
    switch (message.type) {
      case "patch":
        this.patchListeners.forEach((listener) => {
          listener(message.patch);
        });
        return;
      case "error":
        this.errorListeners.forEach((listener) => {
          listener(message.message);
        });
        return;
      case "spectrumBuffer":
        this.spare.set(message.moduleId, message.bins);
        this.inFlight.delete(message.moduleId);
        return;
      case "ready":
        return;
    }
  }

  // One buffer per Spectrum module in flight: copy the analyser's bins into
  // it, transfer it, and get it back on spectrumBuffer. Frames while a
  // buffer is away are skipped. Nothing is read while no view is attached.
  private tick = () => {
    if (this.disposed) return;
    const { readSpectrum } = this.options;
    if (readSpectrum && this.views.size > 0) {
      for (const { id, bins } of readSpectrum()) {
        if (this.inFlight.has(id)) continue;
        let buffer = this.spare.get(id);
        if (buffer?.length !== bins.length) {
          buffer = new Float32Array(bins.length);
        }
        this.spare.delete(id);
        this.inFlight.add(id);
        buffer.set(bins);
        this.send({ type: "spectrum", moduleId: id, bins: buffer }, [
          buffer.buffer,
        ]);
      }
    }
    this.frameHandle = requestAnimationFrame(this.tick);
  };
}
