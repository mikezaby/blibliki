import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

// Order is the shader's u_shape index.
export const SHAPES = ["circle", "ring", "bars"] as const;
export type Shape = (typeof SHAPES)[number];

export type IShapesProps = IInstancesProps & {
  shape: Shape;
  size: number;
  thickness: number;
  count: number;
  x: number;
  y: number;
  softness: number;
};

const DEFAULT_PROPS: IShapesProps = {
  shape: "circle",
  size: 0.25,
  thickness: 0.05,
  count: 4,
  x: 0.5,
  y: 0.5,
  softness: 0.01,
  ...DEFAULT_INSTANCES_PROPS,
};

export const shapesPropSchema: ModulePropSchema<
  IShapesProps,
  { shape: EnumProp<Shape> }
> = {
  ...instancesPropSchema,
  shape: {
    kind: "enum",
    options: [...SHAPES],
    label: "Shape",
    shortLabel: "shape",
  },
  size: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Size",
    shortLabel: "size",
  },
  thickness: {
    kind: "number",
    min: 0,
    max: 0.5,
    step: 0.001,
    label: "Thickness",
    shortLabel: "thick",
  },
  count: {
    kind: "number",
    min: 1,
    max: 32,
    step: 1,
    label: "Count",
    shortLabel: "count",
  },
  x: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "X",
    shortLabel: "x",
  },
  y: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Y",
    shortLabel: "y",
  },
  softness: {
    kind: "number",
    min: 0,
    max: 0.2,
    step: 0.001,
    label: "Softness",
    shortLabel: "soft",
  },
};

// A white shape with alpha, so Merge overlay puts it over a picture: a
// disc of radius size at x, y; a ring of that radius and thickness; or
// count vertical bars of thickness (0..0.5 of a bar's cell).
export default class Shapes extends VideoModule<VideoModuleType.Shapes> {
  readonly inputs = [
    { name: "size", kind: "control" },
    { name: "thickness", kind: "control" },
    { name: "count", kind: "control" },
    { name: "x", kind: "control" },
    { name: "y", kind: "control" },
  ] as const;
  readonly schema = shapesPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Shapes>) {
    super(VideoModuleType.Shapes, DEFAULT_PROPS, params);
  }
}
