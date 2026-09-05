import { Optional } from "@blibliki/utils";
import { IVideoPatch } from "./VideoEngine";
import { ICreateVideoModule } from "./core/Module";
import { IRoute } from "./core/Routes";
import { IBinding } from "./core/controls";

export type HostMessage =
  | { type: "init"; canvas: OffscreenCanvas; width: number; height: number }
  | { type: "resize"; width: number; height: number }
  | { type: "detach" }
  | { type: "load"; patch: IVideoPatch }
  | { type: "addModule"; module: ICreateVideoModule }
  | { type: "removeModule"; id: string }
  | { type: "updateProps"; id: string; props: Record<string, unknown> }
  | { type: "addRoute"; route: Optional<IRoute, "id"> }
  | { type: "removeRoute"; id: string }
  | { type: "setBinding"; binding: IBinding }
  | { type: "removeBinding"; id: string }
  | { type: "controls"; values: Record<string, number> }
  | { type: "spectrum"; bins: Float32Array };

export type WorkerMessage =
  | { type: "ready" }
  | { type: "patch"; patch: IVideoPatch }
  | { type: "spectrumBuffer"; bins: Float32Array }
  | { type: "error"; message: string };

export type GraphMessage = Exclude<
  HostMessage,
  { type: "init" } | { type: "resize" } | { type: "detach" }
>;
