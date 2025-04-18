import { IAnyAudioContext, IModule, Module } from "@/core";
import { ICreateParams, ModuleType } from ".";

export type IVolume = IModule<ModuleType.Volume>;
export type IVolumeProps = {
  volume: number;
};

const DEFAULT_PROPS: IVolumeProps = { volume: 100 };

export default class Volume extends Module<ModuleType.Volume> {
  declare audioNode: GainNode;

  constructor(
    context: IAnyAudioContext,
    params: ICreateParams<ModuleType.Volume>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNode = new GainNode(context);

    super(context, {
      ...params,
      audioNode,
      props,
    });

    this.registerDefaultIOs();
    this.registerAdditionalInputs();
  }

  protected onSetVolume(value: IVolumeProps["volume"]) {
    this.audioNode.gain.value = value;
  }

  private registerAdditionalInputs() {
    this.registerAudioInput({
      name: "volume",
      getAudioNode: () => this.audioNode.gain,
    });
  }
}
