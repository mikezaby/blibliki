import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IMergeProps = { mix: number };

const DEFAULT_PROPS: IMergeProps = { mix: 0.5 };

export const mergePropSchema: ModulePropSchema<IMergeProps> = {
  mix: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Mix",
    shortLabel: "mix",
  },
};

export default class Merge extends VideoModule<VideoModuleType.Merge> {
  readonly inputs = ["a", "b"] as const;
  readonly schema = mergePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Merge>) {
    super(VideoModuleType.Merge, DEFAULT_PROPS, params);
  }
}
