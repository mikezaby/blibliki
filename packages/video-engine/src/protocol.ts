import { IVideoPatch } from "./VideoEngine";
import { ICreateVideoModule, MidiNoteEvent } from "./core/Module";
import { ICreateRoute } from "./core/Routes";
import { MediaModuleState } from "./core/media";

export type HostMessage =
  | {
      type: "attachView";
      id: string;
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      maxFps: number;
    }
  | { type: "resizeView"; id: string; width: number; height: number }
  | { type: "detachView"; id: string }
  | { type: "load"; patch: IVideoPatch }
  | { type: "addModule"; module: ICreateVideoModule }
  | { type: "removeModule"; id: string }
  | { type: "updateProps"; id: string; props: Record<string, unknown> }
  | { type: "addRoute"; route: ICreateRoute }
  | { type: "removeRoute"; id: string }
  | { type: "controls"; values: Record<string, number> }
  | { type: "midi"; moduleId: string; ioName: string; event: MidiNoteEvent }
  // A decoded media frame for the renderer, transferred.
  | { type: "frame"; key: string; bitmap: ImageBitmap }
  | {
      type: "spectrum";
      moduleId: string;
      bins: Float32Array;
      sampleRate: number;
    };

export type WorkerMessage =
  | { type: "ready" }
  | { type: "patch"; patch: IVideoPatch }
  | { type: "spectrumBuffer"; moduleId: string; bins: Float32Array }
  | { type: "viewsDropped" }
  // Each Video module's per-instance playback state, whenever it changes.
  | { type: "media"; modules: MediaModuleState[] }
  // Control module outputs by name, a few times a second while rendering.
  | { type: "values"; values: Record<string, number> }
  | { type: "error"; message: string };

export type GraphMessage = Exclude<
  HostMessage,
  | { type: "attachView" }
  | { type: "resizeView" }
  | { type: "detachView" }
  | { type: "frame" }
>;
