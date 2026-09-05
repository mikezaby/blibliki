import { IVideoPatch } from "@/VideoEngine";
import { HostMessage, WorkerMessage } from "@/protocol";
import { PatchSource, propsToControls } from "./mirror";
import { openProjectorWindow, ProjectorWindow } from "./projectorWindow";

export type VideoEngineHostOptions = {
  patchSource: PatchSource;
  createWorker: () => Worker;
  // Returns the current frequency bins (dB) or undefined when no analyser is
  // in the patch. The array is copied before transfer, so returning the
  // analyser's own buffer is fine.
  readSpectrum?: () => Float32Array | undefined;
};

export class VideoEngineHost {
  private worker: Worker;
  private projector: ProjectorWindow | null = null;
  private spare: Float32Array | null = null;
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
    const offscreen = canvas.transferControlToOffscreen();
    this.send(
      {
        type: "init",
        canvas: offscreen,
        width: win.innerWidth,
        height: win.innerHeight,
      },
      [offscreen],
    );

    win.addEventListener("resize", () => {
      this.send({
        type: "resize",
        width: win.innerWidth,
        height: win.innerHeight,
      });
    });
    win.addEventListener("pagehide", () => {
      this.send({ type: "detach" });
      this.projector = null;
    });

    this.startSpectrum();

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
        this.spare = message.bins;
        return;
      case "ready":
        return;
    }
  }

  // One buffer in flight: copy the analyser's bins into it, transfer it, and
  // get it back on spectrumBuffer. Frames while it is away are skipped.
  private startSpectrum() {
    cancelAnimationFrame(this.frameHandle);
    const { readSpectrum } = this.options;
    if (!readSpectrum) return;

    const tick = () => {
      if (this.disposed || !this.projector) return;
      const bins = readSpectrum();
      if (bins) {
        if (this.spare?.length !== bins.length) {
          this.spare = new Float32Array(bins.length);
        }
        const buffer = this.spare;
        this.spare = null;
        buffer.set(bins);
        this.send({ type: "spectrum", bins: buffer }, [buffer.buffer]);
      }
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }
}
