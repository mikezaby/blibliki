import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type INoiseProps = IInstancesProps & {
  scale: number;
  speed: number;
  octaves: number;
  contrast: number;
};

const DEFAULT_PROPS: INoiseProps = {
  scale: 8,
  speed: 0.2,
  octaves: 3,
  contrast: 1.5,
  ...DEFAULT_INSTANCES_PROPS,
};

export const noisePropSchema: ModulePropSchema<INoiseProps> = {
  ...instancesPropSchema,
  scale: {
    kind: "number",
    min: 1,
    max: 64,
    step: 0.1,
    exp: 2,
    label: "Scale",
    shortLabel: "scale",
  },
  speed: {
    kind: "number",
    min: 0,
    max: 4,
    step: 0.01,
    label: "Speed",
    shortLabel: "speed",
  },
  octaves: {
    kind: "number",
    min: 1,
    max: 4,
    step: 1,
    label: "Octaves",
    shortLabel: "oct",
  },
  contrast: {
    kind: "number",
    min: 0.5,
    max: 4,
    step: 0.01,
    label: "Contrast",
    shortLabel: "contr",
  },
};

// Grey value noise drifting with the clock; colour it with Merge multiply
// over a Source, or shape it with Color.
export default class Noise extends VideoModule<VideoModuleType.Noise> {
  readonly inputs = [
    { name: "scale", kind: "control" },
    { name: "speed", kind: "control" },
    { name: "contrast", kind: "control" },
  ] as const;
  readonly schema = noisePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Noise>) {
    super(VideoModuleType.Noise, DEFAULT_PROPS, params);
  }
}
