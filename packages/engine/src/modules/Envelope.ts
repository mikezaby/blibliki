import { ContextTime } from "@blibliki/transport";
import { Context, cancelAndHoldAtTime } from "@blibliki/utils";
import { Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { PropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IEnvelopeProps = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

const DEFAULT_PROPS: IEnvelopeProps = {
  attack: 0.01,
  decay: 0,
  sustain: 1,
  release: 0,
};

export const envelopePropSchema: PropSchema<IEnvelopeProps> = {
  attack: {
    kind: "number",
    min: 0.0001,
    max: 20,
    step: 0.01,
    label: "Attack",
  },
  decay: {
    kind: "number",
    min: 0,
    max: 20,
    step: 0.01,
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
    max: 20,
    step: 0.01,
    label: "Release",
  },
};

class MonoEnvelope extends Module<ModuleType.Envelope> {
  declare audioNode: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Envelope>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) => {
      const audioNode = new GainNode(context.audioContext);
      audioNode.gain.value = 0;
      return audioNode;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs();
  }

  triggerAttack(note: Note, triggeredAt: ContextTime) {
    super.triggerAttack(note, triggeredAt);

    const attack = this.props.attack;
    const decay = this.props.decay;
    const sustain = this.props.sustain;

    cancelAndHoldAtTime(this.audioNode.gain, triggeredAt);

    // Always start from a tiny value, can't ramp from 0
    if (this.audioNode.gain.value === 0) {
      this.audioNode.gain.setValueAtTime(0.001, triggeredAt);
    }

    // Attack
    this.audioNode.gain.exponentialRampToValueAtTime(1.0, triggeredAt + attack);

    // Decay
    if (sustain > 0) {
      this.audioNode.gain.exponentialRampToValueAtTime(
        sustain,
        triggeredAt + attack + decay,
      );
      // Do not set to zero or anything else!
    } else {
      this.audioNode.gain.exponentialRampToValueAtTime(
        0.001,
        triggeredAt + attack + decay,
      );
    }
  }

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);
    if (this.activeNotes.length > 0) return;

    const release = this.props.release;

    // Cancel scheduled automations and set gain to the ACTUAL value at this moment
    const currentGainValue = cancelAndHoldAtTime(
      this.audioNode.gain,
      triggeredAt,
    );

    if (currentGainValue >= 0.0001) {
      // Always set the value at the release time to ensure a smooth ramp from here
      this.audioNode.gain.setValueAtTime(currentGainValue, triggeredAt);
      // Exponential ramp to a tiny value
      this.audioNode.gain.exponentialRampToValueAtTime(
        0.0001,
        triggeredAt + release - 0.0001,
      );
    }

    // Set to zero at the very end
    this.audioNode.gain.setValueAtTime(0, triggeredAt + release);
  }
}

export default class Envelope extends PolyModule<ModuleType.Envelope> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Envelope>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Envelope>,
    ) => new MonoEnvelope(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }
}
