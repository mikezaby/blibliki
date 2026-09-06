import { uuidv4 } from "@blibliki/utils";
import type { VideoModuleType, VideoPropsMapping } from "@/modules";
import type { IOKind } from "./Routes";
import type { PropSchema } from "./schema";

export type IVideoModule<T extends VideoModuleType = VideoModuleType> = {
  id: string;
  name: string;
  moduleType: T;
  props: VideoPropsMapping[T];
};

export type ICreateVideoModule<T extends VideoModuleType = VideoModuleType> =
  Omit<IVideoModule<T>, "id" | "props"> & {
    id?: string;
    props?: Partial<VideoPropsMapping[T]>;
  };

export type IOPort = { name: string; kind: IOKind };

export type FrameClock = { now: number; dt: number };

export type ControlValues = ReadonlyMap<string, number>;

const TEXTURE_OUT: readonly IOPort[] = [{ name: "out", kind: "texture" }];

export abstract class VideoModule<T extends VideoModuleType = VideoModuleType> {
  readonly id: string;
  name: string;
  readonly moduleType: T;
  props: VideoPropsMapping[T];

  // Texture inputs in the order the shader's u_<name> samplers expect, and
  // control inputs named after the prop they drive.
  abstract readonly inputs: readonly IOPort[];
  readonly outputs: readonly IOPort[] = TEXTURE_OUT;
  abstract readonly schema: Record<keyof VideoPropsMapping[T], PropSchema>;

  constructor(
    moduleType: T,
    defaults: VideoPropsMapping[T],
    params: ICreateVideoModule<T>,
  ) {
    this.id = params.id ?? uuidv4();
    this.name = params.name;
    this.moduleType = moduleType;
    this.props = { ...defaults, ...params.props };
  }

  updateProps(props: Partial<VideoPropsMapping[T]>) {
    this.props = { ...this.props, ...props };
  }

  // Control modules compute their outputs once per frame from `props`, which
  // the engine has already run through the module's control routes; texture
  // modules return null and are never ticked.
  tick(
    _values: ControlValues,
    _frame: FrameClock,
    _props: VideoPropsMapping[T] = this.props,
  ): Record<string, number> | null {
    return null;
  }

  serialize(): IVideoModule<T> {
    return {
      id: this.id,
      name: this.name,
      moduleType: this.moduleType,
      props: this.props,
    };
  }
}
