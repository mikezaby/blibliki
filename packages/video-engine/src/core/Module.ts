import { uuidv4 } from "@blibliki/utils";
import type { VideoModuleType, VideoPropsMapping } from "@/modules";
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

export abstract class VideoModule<T extends VideoModuleType = VideoModuleType> {
  readonly id: string;
  name: string;
  readonly moduleType: T;
  props: VideoPropsMapping[T];

  // Texture inputs, in the order the shader's u_<name> samplers expect.
  abstract readonly inputs: readonly string[];
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

  serialize(): IVideoModule<T> {
    return {
      id: this.id,
      name: this.name,
      moduleType: this.moduleType,
      props: this.props,
    };
  }
}
