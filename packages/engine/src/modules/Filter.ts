import { Context } from "@blibliki/utils";
import { Module } from "@/core";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { PropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { createModule, ICreateModule, ModuleType } from ".";
import { MonoGain } from "./Gain";
import Scale from "./Scale";

export type IFilterProps = {
  cutoff: number;
  envelopeAmount: number;
  resonance: number;
};

const MIN_FREQ = 20;
const MAX_FREQ = 22050;

const DEFAULT_PROPS: IFilterProps = {
  cutoff: MAX_FREQ,
  envelopeAmount: 0,
  resonance: 0,
};

export const filterPropSchema: PropSchema<IFilterProps> = {
  cutoff: {
    kind: "number",
    min: MIN_FREQ,
    max: MAX_FREQ,
    step: 0.0001,
    label: "Cutoff",
  },
  envelopeAmount: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Envelope Amount",
  },
  resonance: {
    kind: "number",
    min: 0,
    max: 4,
    step: 0.01,
    label: "resonance",
  },
};

class MonoFilter extends Module<ModuleType.Filter> {
  declare audioNode: AudioWorkletNode;
  private scale: Scale;
  private amount: MonoGain;

  constructor(engineId: string, params: ICreateModule<ModuleType.Filter>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) =>
      newAudioWorklet(context, CustomWorklet.FilterProcessor);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.amount = new MonoGain(engineId, {
      name: "amount",
      moduleType: ModuleType.Gain,
      props: { gain: props.envelopeAmount },
    });

    this.scale = createModule(engineId, {
      name: "scale",
      moduleType: ModuleType.Scale,
      props: { min: MIN_FREQ, max: MAX_FREQ, current: this.props.cutoff },
    }) as Scale;

    this.amount.plug({ audioModule: this.scale, from: "out", to: "in" });
    this.scale.audioNode.connect(this.cutoff);

    this.registerDefaultIOs();
    this.registerInputs();
  }

  get cutoff() {
    return this.audioNode.parameters.get("cutoff")!;
  }

  get resonance() {
    return this.audioNode.parameters.get("resonance")!;
  }

  protected onSetCutoff(value: IFilterProps["cutoff"]) {
    if (!this.superInitialized) return;

    this.scale.props = { current: value };
  }

  protected onSetResonance(value: IFilterProps["resonance"]) {
    this.resonance.value = value;
  }

  protected onSetEnvelopeAmount(value: IFilterProps["envelopeAmount"]) {
    if (!this.superInitialized) return;

    this.amount.props = { gain: value };
  }

  private registerInputs() {
    this.registerAudioInput({
      name: "cutoff",
      getAudioNode: () => this.scale.audioNode,
    });

    this.registerAudioInput({
      name: "cutoffMod",
      getAudioNode: () => this.amount.audioNode,
    });

    this.registerAudioInput({
      name: "Q",
      getAudioNode: () => this.resonance,
    });
  }
}

export default class Filter extends PolyModule<ModuleType.Filter> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Filter>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Filter>,
    ) => new MonoFilter(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerInputs();
    this.registerDefaultIOs();
  }

  private registerInputs() {
    this.registerAudioInput({ name: "cutoff" });
    this.registerAudioInput({ name: "cutoffMod" });
    this.registerAudioInput({ name: "Q" });
  }
}
