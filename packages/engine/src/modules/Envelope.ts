import { createScaleNormalized } from "@blibliki/utils";
import { IAnyAudioContext, Module } from "@/core";
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
  currentNote?: Note;

  constructor(engineId: string, params: ICreateModule<ModuleType.Envelope>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: IAnyAudioContext) => {
      const audioNode = new GainNode(context);
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

  triggerAttack = (note: Note, triggeredAt: TTime) => {
    this.currentNote = note;

    const attack = this.scaledAttack();
    const decay = this.scaledDecay();
    const sustain = this.props.sustain;
    const triggeredAtNum = nt(triggeredAt);

    this.audioNode.gain.cancelAndHoldAtTime(triggeredAtNum);

    if (this.audioNode.gain.value === 0) {
      this.audioNode.gain.setValueAtTime(0.001, triggeredAtNum);
    }

    // Attack
    this.audioNode.gain.exponentialRampToValueAtTime(
      1.0,
      triggeredAtNum + attack,
    );
    // Decay
    this.audioNode.gain.exponentialRampToValueAtTime(
      sustain || 0.001,
      triggeredAtNum + (attack + decay),
    );

    this.audioNode.gain.setValueAtTime(
      sustain,
      triggeredAtNum + (attack + decay),
    );
  };

  triggerRelease = (note: Note, triggeredAt: TTime) => {
    if (note.fullName !== this.currentNote?.fullName) return;

    const release = this.scaledRelease();
    const triggeredAtNum = nt(triggeredAt);

    this.audioNode.gain.cancelAndHoldAtTime(triggeredAtNum);
    this.audioNode.gain.exponentialRampToValueAtTime(
      0.001,
      triggeredAtNum + release - 0.01,
    );
    this.audioNode.gain.setValueAtTime(0, triggeredAtNum + release);
    this.currentNote = undefined;
  };

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
