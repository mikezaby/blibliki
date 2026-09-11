import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IColorProps = IInstancesProps & {
  brightness: number;
  contrast: number;
  saturation: number;
  invert: boolean;
};

const DEFAULT_PROPS: IColorProps = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  invert: false,
  ...DEFAULT_INSTANCES_PROPS,
};

export const colorPropSchema: ModulePropSchema<IColorProps> = {
  ...instancesPropSchema,
  brightness: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Brightness",
    shortLabel: "bright",
  },
  contrast: {
    kind: "number",
    min: 0,
    max: 3,
    step: 0.01,
    label: "Contrast",
    shortLabel: "contr",
  },
  saturation: {
    kind: "number",
    min: 0,
    max: 3,
    step: 0.01,
    label: "Saturation",
    shortLabel: "sat",
  },
  invert: { kind: "boolean", label: "Invert", shortLabel: "inv" },
};

export default class Color extends VideoModule<VideoModuleType.Color> {
  readonly inputs = [
    { name: "in", kind: "texture" },
    { name: "brightness", kind: "control" },
    { name: "contrast", kind: "control" },
    { name: "saturation", kind: "control" },
  ] as const;
  readonly schema = colorPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Color>) {
    super(VideoModuleType.Color, DEFAULT_PROPS, params);
  }
}
