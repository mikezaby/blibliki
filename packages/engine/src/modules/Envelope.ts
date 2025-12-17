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
const MIN_GAIN = 0.00001; // Minimum gain value for exponential ramps (below hearing threshold ~-100dB)
const MIN_TIME = 0.001; // Minimum time segment (1ms) to prevent automation issues
const RELEASE_TIME_CONSTANT_RATIO = 0.3; // For setTargetAtTime, produces ~95% decay

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

    const { attack, decay, sustain } = this.props;
    const gain = this.audioNode.gain;

    // Ensure minimum time values to prevent automation issues
    const safeAttack = Math.max(attack, MIN_TIME);
    const safeDecay = Math.max(decay, MIN_TIME);
    const safeSustain = Math.max(sustain, MIN_GAIN);

    // Cancel all scheduled automations
    gain.cancelScheduledValues(triggeredAt);

    // Get current gain value for smooth retriggering
    // Note: We read the value synchronously, which may not be perfectly accurate
    // during scheduled automations, but it's better than hard-coded values
    const currentValue = gain.value;

    // If we're retriggering from a non-zero value, start from there
    // Otherwise start from MIN_GAIN to enable exponential ramp
    const attackStartValue = currentValue > MIN_GAIN ? currentValue : MIN_GAIN;

    // Set the starting value
    gain.setValueAtTime(attackStartValue, triggeredAt);

    // Attack phase: ramp to peak (1.0)
    const attackEndTime = triggeredAt + safeAttack;
    gain.linearRampToValueAtTime(1.0, attackEndTime);

    // Decay phase: ramp to sustain level
    const decayEndTime = attackEndTime + safeDecay;
    gain.exponentialRampToValueAtTime(safeSustain, decayEndTime);
  }

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    // Only release if this is the last active note
    if (this.activeNotes.length > 0) return;

    const { release } = this.props;
    const gain = this.audioNode.gain;

    // Ensure minimum release time
    const safeRelease = Math.max(release, MIN_TIME);

    // Cancel all scheduled automations from this point forward
    gain.cancelScheduledValues(triggeredAt);

    // Get the current gain value at release time
    // This ensures smooth transitions regardless of which phase we're releasing from
    const currentValue = gain.value;

    // Set the starting value for the release
    gain.setValueAtTime(currentValue, triggeredAt);

    // Release phase: exponential decay to silence
    // We use setTargetAtTime with a time constant for a smooth exponential decay
    // Time constant = release time * RELEASE_TIME_CONSTANT_RATIO
    // This produces approximately 95% decay over the release time
    const timeConstant = safeRelease * RELEASE_TIME_CONSTANT_RATIO;
    gain.setTargetAtTime(0, triggeredAt, timeConstant);

    // Schedule final silence slightly after the release time
    // This ensures we reach true zero for garbage collection
    const releaseEndTime = triggeredAt + safeRelease * 1.5;
    gain.setValueAtTime(0, releaseEndTime);
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
