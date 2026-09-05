import { ICreateVideoModule, VideoModule } from "@/core/Module";
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
export type IMergeProps = { mode: MergeMode; amount: number };

const DEFAULT_PROPS: IMergeProps = { mode: "crossfade", amount: 0.5 };

export const mergePropSchema: ModulePropSchema<
  IMergeProps,
  { mode: EnumProp<MergeMode> }
> = {
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
  readonly inputs = ["a", "b"] as const;
  readonly schema = mergePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Merge>) {
    super(VideoModuleType.Merge, DEFAULT_PROPS, params);
  }
}
