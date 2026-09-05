import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import HueRotate, { IHueRotateProps } from "./HueRotate";
import Merge, { IMergeProps } from "./Merge";
import Output, { IOutputProps } from "./Output";
import Overlay, { IOverlayProps } from "./Overlay";
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
  [VideoModuleType.HueRotate]: IHueRotateProps;
  [VideoModuleType.Merge]: IMergeProps;
  [VideoModuleType.Overlay]: IOverlayProps;
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
    case VideoModuleType.Overlay:
      return new Overlay(params as ICreateVideoModule<VideoModuleType.Overlay>);
    case VideoModuleType.Output:
      return new Output(params as ICreateVideoModule<VideoModuleType.Output>);
    default:
      return assertNever(type);
  }
}

export { HueRotate, Merge, Output, Overlay, Source };
export type { IHueRotateProps } from "./HueRotate";
export type { IMergeProps } from "./Merge";
export type { IOutputProps } from "./Output";
export type { IOverlayProps } from "./Overlay";
export type { ISourceProps, SourceMode } from "./Source";
