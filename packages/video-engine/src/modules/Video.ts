import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { mediaKey } from "@/core/media";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IVideoProps = IInstancesProps & {
  file: string;
  playing: boolean;
  speed: number;
  seek: number;
};

const DEFAULT_PROPS: IVideoProps = {
  file: "",
  playing: true,
  speed: 1,
  seek: 0,
  ...DEFAULT_INSTANCES_PROPS,
};

export const videoPropSchema: ModulePropSchema<IVideoProps> = {
  ...instancesPropSchema,
  file: { kind: "string", label: "File", shortLabel: "file" },
  playing: { kind: "boolean", label: "Playing", shortLabel: "play" },
  speed: {
    kind: "number",
    min: 0.25,
    max: 4,
    step: 0.01,
    exp: 2,
    label: "Speed",
    shortLabel: "speed",
  },
  seek: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Seek",
    shortLabel: "seek",
  },
};

// A video the host plays once per instance and uploads frame by frame.
// Each instance has its own player, so seek driven per instance shows the
// file at as many positions as there are instances. A change of seek
// moves that instance's player to that fraction of the file.
export default class Video extends VideoModule<VideoModuleType.Video> {
  readonly inputs = [
    { name: "speed", kind: "control" },
    { name: "seek", kind: "control" },
  ] as const;
  readonly schema = videoPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Video>) {
    super(VideoModuleType.Video, DEFAULT_PROPS, params);
  }

  externalInputs(instance = 0): Record<string, string> {
    return { frame: mediaKey(this.id, instance) };
  }
}
