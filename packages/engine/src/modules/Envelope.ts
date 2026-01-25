import { ContextTime } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";

export type ICustomEnvelopeProps = {
  attack: number;
  attackCurve: number;
  decay: number;
  sustain: number;
  release: number;
};

const DEFAULT_PROPS: ICustomEnvelopeProps = {
  attack: 0.1,
  attackCurve: 0.5,
  decay: 0.1,
  sustain: 1,
  release: 0.1,
};

export const customEnvelopePropSchema: ModulePropSchema<ICustomEnvelopeProps> =
  {
    attack: {
      kind: "number",
      min: 0,
      max: 10,
      step: 0.01,
      exp: 7,
      label: "Attack",
    },
    attackCurve: {
      kind: "number",
      min: 0,
      max: 1,
      step: 0.01,
      label: "Attack Curve",
    },
    decay: {
      kind: "number",
      min: 0,
      max: 10,
      step: 0.01,
      exp: 6.6,
      label: "Decay",
    },
    sustain: {
      kind: "number",
      min: 0,
      max: 1,
      step: 0.01,
      label: "Sustain",
    },
    release: {
      kind: "number",
      min: 0,
      max: 10,
      step: 0.01,
      exp: 5,
      label: "Release",
    },
  };

type CustomEnvelopeSetterHooks = SetterHooks<ICustomEnvelopeProps>;

class MonoCustomEnvelope
  extends Module<ModuleType.Envelope>
  implements
    Pick<
      CustomEnvelopeSetterHooks,
      | "onAfterSetAttack"
      | "onAfterSetAttackCurve"
      | "onAfterSetDecay"
      | "onAfterSetSustain"
      | "onAfterSetRelease"
    >
{
  declare audioNode: ReturnType<typeof newAudioWorklet>;
  private gainNode!: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Envelope>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) => {
      const audioNode = newAudioWorklet(
        context,
        CustomWorklet.CustomEnvelopeProcessor,
      );

      // Set initial parameter values
      audioNode.parameters.get("attack")!.value = props.attack;
      audioNode.parameters.get("attackcurve")!.value = props.attackCurve;
      audioNode.parameters.get("decay")!.value = props.decay;
      audioNode.parameters.get("sustain")!.value = props.sustain;
      audioNode.parameters.get("release")!.value = props.release;

      return audioNode;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.gainNode = new GainNode(this.context.audioContext, {
      gain: 0,
    });
    this.audioNode.connect(this.gainNode.gain);

    this.registerIOs();
  }

  // AudioParam getters
  get attackParam() {
    return this.audioNode.parameters.get("attack")!;
  }

  get attackCurveParam() {
    return this.audioNode.parameters.get("attackcurve")!;
  }

  get decayParam() {
    return this.audioNode.parameters.get("decay")!;
  }

  get sustainParam() {
    return this.audioNode.parameters.get("sustain")!;
  }

  get releaseParam() {
    return this.audioNode.parameters.get("release")!;
  }

  get triggerParam() {
    return this.audioNode.parameters.get("trigger")!;
  }

  // Setter hooks that update AudioParams
  onAfterSetAttack: CustomEnvelopeSetterHooks["onAfterSetAttack"] = (value) => {
    this.attackParam.value = value;
  };

  onAfterSetAttackCurve: CustomEnvelopeSetterHooks["onAfterSetAttackCurve"] = (
    value,
  ) => {
    this.attackCurveParam.value = value;
  };

  onAfterSetDecay: CustomEnvelopeSetterHooks["onAfterSetDecay"] = (value) => {
    this.decayParam.value = value;
  };

  onAfterSetSustain: CustomEnvelopeSetterHooks["onAfterSetSustain"] = (
    value,
  ) => {
    this.sustainParam.value = value;
  };

  onAfterSetRelease: CustomEnvelopeSetterHooks["onAfterSetRelease"] = (
    value,
  ) => {
    this.releaseParam.value = value;
  };

  triggerAttack(note: Note, triggeredAt: ContextTime) {
    super.triggerAttack(note, triggeredAt);

    this.triggerParam.setValueAtTime(1, triggeredAt);
  }

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    // Only release if this is the last active note
    if (this.activeNotes.length > 0) return;

    this.triggerParam.setValueAtTime(0, triggeredAt);
  }

  dispose() {
    this.gainNode.disconnect();
    super.dispose();
  }

  private registerIOs() {
    this.registerAudioInput({
      name: "in",
      getAudioNode: () => this.gainNode,
    });

    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.gainNode,
    });
  }
}

export default class CustomEnvelope extends PolyModule<ModuleType.Envelope> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Envelope>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Envelope>,
    ) => Module.create(MonoCustomEnvelope, engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }
}
