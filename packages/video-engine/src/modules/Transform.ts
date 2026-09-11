import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type ITransformProps = IInstancesProps & {
  zoom: number;
  rotate: number;
  x: number;
  y: number;
  tile: boolean;
};

const DEFAULT_PROPS: ITransformProps = {
  zoom: 1,
  rotate: 0,
  x: 0,
  y: 0,
  tile: false,
  ...DEFAULT_INSTANCES_PROPS,
};

export const transformPropSchema: ModulePropSchema<ITransformProps> = {
  ...instancesPropSchema,
  zoom: {
    kind: "number",
    min: 0.1,
    max: 8,
    step: 0.01,
    exp: 2,
    label: "Zoom",
    shortLabel: "zoom",
  },
  rotate: {
    kind: "number",
    min: -180,
    max: 180,
    step: 1,
    label: "Rotate",
    shortLabel: "rot",
  },
  x: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "X",
    shortLabel: "x",
  },
  y: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Y",
    shortLabel: "y",
  },
  tile: { kind: "boolean", label: "Tile", shortLabel: "tile" },
};

// Zoom and rotate around the centre, then pan. Outside the picture is
// transparent black, or the picture repeats when tiling.
export default class Transform extends VideoModule<VideoModuleType.Transform> {
  readonly inputs = [
    { name: "in", kind: "texture" },
    { name: "zoom", kind: "control" },
    { name: "rotate", kind: "control" },
    { name: "x", kind: "control" },
    { name: "y", kind: "control" },
  ] as const;
  readonly schema = transformPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Transform>) {
    super(VideoModuleType.Transform, DEFAULT_PROPS, params);
  }
}
