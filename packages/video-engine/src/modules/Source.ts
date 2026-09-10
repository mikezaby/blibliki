import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { DEFAULT_POLY_PROPS, IPolyProps, polyPropSchema } from "@/core/poly";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type SourceMode = "solid" | "gradient";

export type ISourceProps = IPolyProps & {
  mode: SourceMode;
  hue: number;
  saturation: number;
  lightness: number;
  spread: number;
};

const DEFAULT_PROPS: ISourceProps = {
  mode: "solid",
  hue: 0,
  saturation: 1,
  lightness: 0.5,
  spread: 180,
  ...DEFAULT_POLY_PROPS,
};

export const sourcePropSchema: ModulePropSchema<
  ISourceProps,
  { mode: EnumProp<SourceMode> }
> = {
  ...polyPropSchema,
  mode: {
    kind: "enum",
    options: ["solid", "gradient"],
    label: "Mode",
    shortLabel: "mode",
  },
  hue: {
    kind: "number",
    min: 0,
    max: 360,
    step: 1,
    label: "Hue",
    shortLabel: "hue",
  },
  saturation: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Saturation",
    shortLabel: "sat",
  },
  lightness: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Lightness",
    shortLabel: "light",
  },
  spread: {
    kind: "number",
    min: 0,
    max: 360,
    step: 1,
    label: "Hue spread",
    shortLabel: "spread",
  },
};

export default class Source extends VideoModule<VideoModuleType.Source> {
  readonly inputs = [
    { name: "hue", kind: "control" },
    { name: "saturation", kind: "control" },
    { name: "lightness", kind: "control" },
    { name: "spread", kind: "control" },
  ] as const;
  readonly schema = sourcePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Source>) {
    super(VideoModuleType.Source, DEFAULT_PROPS, params);
  }
}
