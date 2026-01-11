import { ContextTime } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IEnvelopeProps = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

const DEFAULT_PROPS: IEnvelopeProps = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

export const envelopePropSchema: ModulePropSchema<IEnvelopeProps> = {
  attack: {
    kind: "number",
    min: 0.001,
    max: 10,
    step: 0.001,
    exp: 3,
    label: "Attack",
  },
  decay: {
    kind: "number",
    min: 0.001,
    max: 10,
    step: 0.001,
    exp: 3,
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
    min: 0.001,
    max: 10,
    step: 0.001,
    exp: 3,
    label: "Release",
  },
};

// Constants for safe audio parameter automation
const MIN_GAIN = 0.00001;

class MonoEnvelope extends Module<ModuleType.LegacyEnvelope> {
  declare audioNode: GainNode;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.LegacyEnvelope>,
  ) {
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

    const { attack, decay, sustain } = this.props;
    const gain = this.audioNode.gain;

    // Exponential reset to avoid clicks when retriggering (production-style)
    gain.cancelAndHoldAtTime(triggeredAt);
    const resetTimeConstant = 0.002; // 2ms time constant for exponential decay
    const resetDuration = resetTimeConstant * 5; // ~10ms total (5 time constants ≈ 99% complete)
    gain.setTargetAtTime(MIN_GAIN, triggeredAt, resetTimeConstant);

    // Attack phase: linear ramp to peak
    const attackStartTime = triggeredAt + resetDuration;
    const attackEndTime = attackStartTime + attack;
    gain.setValueAtTime(MIN_GAIN, attackStartTime); // Ensure we start from MIN_GAIN
    gain.linearRampToValueAtTime(1.0, attackEndTime);

    // Decay phase: exponential ramp to sustain level
    if (sustain < 1) {
      const decayEndTime = attackEndTime + decay;
      // exponentialRampToValueAtTime cannot reach 0, use MIN_GAIN instead
      const sustainValue = sustain > 0 ? sustain : MIN_GAIN;
      gain.exponentialRampToValueAtTime(sustainValue, decayEndTime);
    }
  }

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    // Only release if this is the last active note
    if (this.activeNotes.length > 0) return;

    const { release } = this.props;
    const gain = this.audioNode.gain;

    // Release phase: exponential fade to silence (analog-style)
    gain.cancelAndHoldAtTime(triggeredAt);
    gain.setTargetAtTime(MIN_GAIN, triggeredAt, release);
  }
}

export default class Envelope extends PolyModule<ModuleType.LegacyEnvelope> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.LegacyEnvelope>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.LegacyEnvelope>,
    ) => new MonoEnvelope(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }
}
