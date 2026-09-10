import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

// Order is the shader's u_mode index.
export const MERGE_MODES = [
  "crossfade",
  "overlay",
  "vertical",
  "horizontal",
  "diagonal",
] as const;

export type MergeMode = (typeof MERGE_MODES)[number];

// amount is the blend for crossfade, the layer opacity for overlay, and the
// split position for the three splits.
export type IMergeProps = IInstancesProps & {
  mode: MergeMode;
  amount: number;
};

const DEFAULT_PROPS: IMergeProps = {
  mode: "crossfade",
  amount: 0.5,
  ...DEFAULT_INSTANCES_PROPS,
};

export const mergePropSchema: ModulePropSchema<
  IMergeProps,
  { mode: EnumProp<MergeMode> }
> = {
  ...instancesPropSchema,
  mode: {
    kind: "enum",
    options: [...MERGE_MODES],
    label: "Mode",
    shortLabel: "mode",
  },
  amount: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Amount",
    shortLabel: "amt",
  },
};

export default class Merge extends VideoModule<VideoModuleType.Merge> {
  readonly inputs = [
    { name: "a", kind: "texture" },
    { name: "b", kind: "texture" },
    { name: "amount", kind: "control" },
  ] as const;
  readonly schema = mergePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Merge>) {
    super(VideoModuleType.Merge, DEFAULT_PROPS, params);
  }
}
