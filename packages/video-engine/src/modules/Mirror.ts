import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

// Order is the shader's u_mode index.
export const MIRROR_MODES = [
  "horizontal",
  "vertical",
  "quad",
  "kaleido",
] as const;
export type MirrorMode = (typeof MIRROR_MODES)[number];

export type IMirrorProps = IInstancesProps & {
  mode: MirrorMode;
  segments: number;
  angle: number;
};

const DEFAULT_PROPS: IMirrorProps = {
  mode: "horizontal",
  segments: 6,
  angle: 0,
  ...DEFAULT_INSTANCES_PROPS,
};

export const mirrorPropSchema: ModulePropSchema<
  IMirrorProps,
  { mode: EnumProp<MirrorMode> }
> = {
  ...instancesPropSchema,
  mode: {
    kind: "enum",
    options: [...MIRROR_MODES],
    label: "Mode",
    shortLabel: "mode",
  },
  segments: {
    kind: "number",
    min: 2,
    max: 16,
    step: 1,
    label: "Segments",
    shortLabel: "seg",
  },
  angle: {
    kind: "number",
    min: 0,
    max: 360,
    step: 1,
    label: "Angle",
    shortLabel: "ang",
  },
};

// Reflects one half over the other, both halves for quad, or folds the
// picture into wedges around the centre for kaleido; segments and angle
// apply to kaleido.
export default class Mirror extends VideoModule<VideoModuleType.Mirror> {
  readonly inputs = [
    { name: "in", kind: "texture" },
    { name: "segments", kind: "control" },
    { name: "angle", kind: "control" },
  ] as const;
  readonly schema = mirrorPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Mirror>) {
    super(VideoModuleType.Mirror, DEFAULT_PROPS, params);
  }
}
