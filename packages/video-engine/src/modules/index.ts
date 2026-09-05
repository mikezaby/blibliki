import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { PropSchema } from "@/core/schema";
import HueRotate, { hueRotatePropSchema, IHueRotateProps } from "./HueRotate";
import Merge, { IMergeProps, mergePropSchema } from "./Merge";
import Output, { IOutputProps, outputPropSchema } from "./Output";
import Source, { ISourceProps, sourcePropSchema } from "./Source";

export enum VideoModuleType {
  Source = "Source",
  HueRotate = "HueRotate",
  Merge = "Merge",
  Output = "Output",
}

export type VideoPropsMapping = {
  [VideoModuleType.Source]: ISourceProps;
  [VideoModuleType.HueRotate]: IHueRotateProps;
  [VideoModuleType.Merge]: IMergeProps;
  [VideoModuleType.Output]: IOutputProps;
};

export function createModule<T extends VideoModuleType>(
  params: ICreateVideoModule<T>,
): VideoModule {
  const type: VideoModuleType = params.moduleType;
  switch (type) {
    case VideoModuleType.Source:
      return new Source(params as ICreateVideoModule<VideoModuleType.Source>);
    case VideoModuleType.HueRotate:
      return new HueRotate(
        params as ICreateVideoModule<VideoModuleType.HueRotate>,
      );
    case VideoModuleType.Merge:
      return new Merge(params as ICreateVideoModule<VideoModuleType.Merge>);
    case VideoModuleType.Output:
      return new Output(params as ICreateVideoModule<VideoModuleType.Output>);
    default:
      return assertNever(type);
  }
}

export type { IHueRotateProps } from "./HueRotate";
export type { IMergeProps, MergeMode } from "./Merge";
export { MERGE_MODES } from "./Merge";
export type { IOutputProps } from "./Output";
export type { ISourceProps, SourceMode } from "./Source";

export const videoModuleSchemas: Record<
  VideoModuleType,
  Record<string, PropSchema>
> = {
  [VideoModuleType.Source]: sourcePropSchema,
  [VideoModuleType.HueRotate]: hueRotatePropSchema,
  [VideoModuleType.Merge]: mergePropSchema,
  [VideoModuleType.Output]: outputPropSchema,
};

const MODULE_INPUTS = Object.fromEntries(
  Object.values(VideoModuleType).map((moduleType) => [
    moduleType,
    createModule({ name: moduleType, moduleType }).inputs,
  ]),
) as Record<VideoModuleType, readonly string[]>;

export function inputsFor(moduleType: VideoModuleType): readonly string[] {
  return MODULE_INPUTS[moduleType];
}
