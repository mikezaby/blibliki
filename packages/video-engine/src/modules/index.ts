import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import Source, { ISourceProps } from "./Source";

export enum VideoModuleType {
  Source = "Source",
  HueRotate = "HueRotate",
  Merge = "Merge",
  Overlay = "Overlay",
  Output = "Output",
}

export type VideoPropsMapping = {
  [VideoModuleType.Source]: ISourceProps;
  [VideoModuleType.HueRotate]: never;
  [VideoModuleType.Merge]: never;
  [VideoModuleType.Overlay]: never;
  [VideoModuleType.Output]: never;
};

export function createModule<T extends VideoModuleType>(
  params: ICreateVideoModule<T>,
): VideoModule {
  const type: VideoModuleType = params.moduleType;
  switch (type) {
    case VideoModuleType.Source:
      return new Source(params as ICreateVideoModule<VideoModuleType.Source>);
    case VideoModuleType.HueRotate:
    case VideoModuleType.Merge:
    case VideoModuleType.Overlay:
    case VideoModuleType.Output:
      throw new Error(`Module type not implemented yet: ${type}`);
    default:
      return assertNever(type);
  }
}

export { Source };
export type { ISourceProps, SourceMode } from "./Source";
