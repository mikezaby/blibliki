import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IOverlayProps = { opacity: number };

const DEFAULT_PROPS: IOverlayProps = { opacity: 1 };

export const overlayPropSchema: ModulePropSchema<IOverlayProps> = {
  opacity: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Opacity",
    shortLabel: "opac",
  },
};

export default class Overlay extends VideoModule<VideoModuleType.Overlay> {
  readonly inputs = ["base", "layer"] as const;
  readonly schema = overlayPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Overlay>) {
    super(VideoModuleType.Overlay, DEFAULT_PROPS, params);
  }
}
