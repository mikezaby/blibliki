import { Context, createScaleNormalized } from "@blibliki/utils";
import { Module } from "@/core";
import Note from "@/core/Note";
import { nt, TTime } from "@/core/Timing/Time";
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
  attack: 0.1,
  decay: 0.2,
  sustain: 0,
  release: 0.3,
};

export const envelopePropSchema: PropSchema<IEnvelopeProps> = {
  attack: {
    kind: "number",
    min: 0.0001,
    max: 1,
    step: 0.01,
    label: "Attack",
  },
  decay: {
    kind: "number",
    min: 0,
    max: 1,
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
    max: 1,
    step: 0.01,
    label: "Release",
  },
};

const scaleToTen = createScaleNormalized({
  min: 0.001,
  max: 10,
});

const scaleToFive = createScaleNormalized({
  min: 0.001,
  max: 5,
});

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

  triggerAttack(note: Note, triggeredAt: TTime) {
    super.triggerAttack(note, triggeredAt);

    const attack = this.scaledAttack();
    const decay = this.scaledDecay();
    const sustain = this.props.sustain;
    const triggeredAtNum = nt(triggeredAt);

    this.audioNode.gain.cancelAndHoldAtTime(triggeredAtNum);

    // Always start from a tiny value, can't ramp from 0
    if (this.audioNode.gain.value === 0) {
      this.audioNode.gain.setValueAtTime(0.001, triggeredAtNum);
    }

    // Attack
    this.audioNode.gain.exponentialRampToValueAtTime(
      1.0,
      triggeredAtNum + attack,
    );

    // Decay
    if (sustain > 0) {
      this.audioNode.gain.exponentialRampToValueAtTime(
        sustain,
        triggeredAtNum + attack + decay,
      );
      // Do not set to zero or anything else!
    } else {
      this.audioNode.gain.exponentialRampToValueAtTime(
        0.001,
        triggeredAtNum + attack + decay,
      );
    }
  }

  triggerRelease(note: Note, triggeredAt: TTime) {
    super.triggerRelease(note, triggeredAt);
    if (this.activeNotes.length > 0) return;

    const release = this.scaledRelease();
    const triggeredAtNum = nt(triggeredAt);

    // Cancel scheduled automations and set gain to the ACTUAL value at this moment
    this.audioNode.gain.cancelAndHoldAtTime(triggeredAtNum);
    const currentGainValue = this.audioNode.gain.value;

    if (currentGainValue >= 0.0001) {
      // Always set the value at the release time to ensure a smooth ramp from here
      this.audioNode.gain.setValueAtTime(currentGainValue, triggeredAtNum);
      // Exponential ramp to a tiny value
      this.audioNode.gain.exponentialRampToValueAtTime(
        0.0001,
        triggeredAtNum + release - 0.0001,
      );
    }

    // Set to zero at the very end
    this.audioNode.gain.setValueAtTime(0, triggeredAtNum + release);
  }

  private scaledAttack() {
    return scaleToTen(this.props.attack);
  }

  private scaledDecay() {
    return scaleToFive(this.props.decay);
  }

  private scaledRelease() {
    return scaleToTen(this.props.release);
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
