import { Context } from "@blibliki/utils";
import { IModule, Module } from "@/core";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { PropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IGain = IModule<ModuleType.Gain>;
export type IGainProps = {
  gain: number;
};

export const gainPropSchema: PropSchema<IGainProps> = {
  gain: {
    kind: "number",
    min: 0,
    max: Infinity,
    step: 0.01,
    label: "Gain",
  },
};

const DEFAULT_PROPS: IGainProps = { gain: 1 };

export class MonoGain extends Module<ModuleType.Gain> {
  declare audioNode: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Gain>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new GainNode(context.audioContext);

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    this.registerDefaultIOs();
    this.registerAdditionalInputs();
  }

  protected onSetGain(value: IGainProps["gain"]) {
    this.audioNode.gain.value = value;
  }

  private registerAdditionalInputs() {
    this.registerAudioInput({
      name: "gain",
      getAudioNode: () => this.audioNode.gain,
    });
  }
}

export default class Gain extends PolyModule<ModuleType.Gain> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Gain>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Gain>,
    ) => new MonoGain(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerAdditionalInputs();
    this.registerDefaultIOs();
  }

  private registerAdditionalInputs() {
    this.registerAudioInput({ name: "gain" });
  }
}
