import { Context } from "@blibliki/utils";
import { IModule, Module, ModulePropSchema } from "@/core";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ICreateModule, ModuleType } from ".";

export type IStereoPanner = IModule<ModuleType.StereoPanner>;
export type IStereoPannerProps = {
  pan: number;
};

export const stereoPannerPropSchema: ModulePropSchema<IStereoPannerProps> = {
  pan: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Pan",
  },
};

const DEFAULT_PROPS: IStereoPannerProps = {
  pan: 0,
};

export class MonoStereoPanner extends Module<ModuleType.StereoPanner> {
  declare audioNode: StereoPannerNode;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.StereoPanner>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new StereoPannerNode(context.audioContext);

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    this.registerDefaultIOs();
    this.registerAdditionalInputs();
  }

  protected onSetPan(value: IStereoPannerProps["pan"]) {
    this.audioNode.pan.value = value;
  }

  private registerAdditionalInputs() {
    this.registerAudioInput({
      name: "pan",
      getAudioNode: () => this.audioNode.pan,
    });
  }
}

export default class StereoPanner extends PolyModule<ModuleType.StereoPanner> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.StereoPanner>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.StereoPanner>,
    ) => new MonoStereoPanner(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerAdditionalInputs();
    this.registerDefaultIOs();
  }

  private registerAdditionalInputs() {
    this.registerAudioInput({ name: "pan" });
  }
}
