import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IHueRotateProps = IInstancesProps & { amount: number };

const DEFAULT_PROPS: IHueRotateProps = {
  amount: 0,
  ...DEFAULT_INSTANCES_PROPS,
};

export const hueRotatePropSchema: ModulePropSchema<IHueRotateProps> = {
  ...instancesPropSchema,
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
  readonly inputs = [
    { name: "in", kind: "texture" },
    { name: "amount", kind: "control" },
  ] as const;
  readonly schema = hueRotatePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.HueRotate>) {
    super(VideoModuleType.HueRotate, DEFAULT_PROPS, params);
  }
}
