import { ICreateVideoModule, VideoModule } from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { mediaKey } from "@/core/media";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IImageProps = IInstancesProps & { file: string };

const DEFAULT_PROPS: IImageProps = { file: "", ...DEFAULT_INSTANCES_PROPS };

export const imagePropSchema: ModulePropSchema<IImageProps> = {
  ...instancesPropSchema,
  file: { kind: "string", label: "File", shortLabel: "file" },
};

// A picture the host decoded once and uploaded; every instance shows it.
// `file` is only the name shown, the file itself lives with the host for
// the session.
export default class Image extends VideoModule<VideoModuleType.Image> {
  readonly inputs = [] as const;
  readonly schema = imagePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Image>) {
    super(VideoModuleType.Image, DEFAULT_PROPS, params);
  }

  externalInputs(): Record<string, string> {
    return { frame: mediaKey(this.id) };
  }
}
