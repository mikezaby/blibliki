import { EmptyObject } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IOutputProps = EmptyObject;

export const outputPropSchema: ModulePropSchema<IOutputProps> = {};

export default class Output extends VideoModule<VideoModuleType.Output> {
  readonly inputs = [{ name: "in", kind: "texture" }] as const;
  readonly outputs = [] as const;
  readonly schema = outputPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Output>) {
    super(VideoModuleType.Output, {}, params);
  }
}
