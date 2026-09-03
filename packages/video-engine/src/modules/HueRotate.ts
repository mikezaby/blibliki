import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IHueRotateProps = { amount: number };

const DEFAULT_PROPS: IHueRotateProps = { amount: 0 };

export const hueRotatePropSchema: ModulePropSchema<IHueRotateProps> = {
  amount: {
    kind: "number",
    min: 0,
    max: 360,
    step: 1,
    label: "Amount",
    shortLabel: "amt",
  },
};

export default class HueRotate extends VideoModule<VideoModuleType.HueRotate> {
  readonly inputs = ["in"] as const;
  readonly schema = hueRotatePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.HueRotate>) {
    super(VideoModuleType.HueRotate, DEFAULT_PROPS, params);
  }
}
