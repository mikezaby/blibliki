import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IFeedbackProps = IInstancesProps & { decay: number; zoom: number };

const DEFAULT_PROPS: IFeedbackProps = {
  decay: 0.9,
  zoom: 1,
  ...DEFAULT_INSTANCES_PROPS,
};

export const feedbackPropSchema: ModulePropSchema<IFeedbackProps> = {
  ...instancesPropSchema,
  decay: {
    kind: "number",
    min: 0,
    max: 0.99,
    step: 0.01,
    label: "Decay",
    shortLabel: "decay",
  },
  zoom: {
    kind: "number",
    min: 0.5,
    max: 2,
    step: 0.001,
    label: "Zoom",
    shortLabel: "zoom",
  },
};

// Trails: the brighter of the input and last frame's output faded by
// decay and zoomed about the centre. The renderer keeps each instance's
// output for the next frame.
export default class Feedback extends VideoModule<VideoModuleType.Feedback> {
  readonly inputs = [
    { name: "in", kind: "texture" },
    { name: "decay", kind: "control" },
    { name: "zoom", kind: "control" },
  ] as const;
  readonly schema = feedbackPropSchema;
  readonly keepsOutput = true;

  constructor(params: ICreateVideoModule<VideoModuleType.Feedback>) {
    super(VideoModuleType.Feedback, DEFAULT_PROPS, params);
  }

  externalInputs(instance?: number): Record<string, string> {
    const target = instance === undefined ? this.id : `${this.id}:${instance}`;

    return { prev: `${target}:prev` };
  }
}
