import { Context } from "@blibliki/utils";
import { ModulePropSchema } from "@/core";
import { Module, SetterHooks } from "@/core/module/Module";
import { WetDryMixer } from "@/utils";
import { ICreateModule, ModuleType } from ".";

// ============================================================================
// Types
// ============================================================================

export enum ReverbType {
  room = "room",
  hall = "hall",
  plate = "plate",
  spring = "spring",
  chamber = "chamber",
  reflections = "reflections",
}

export type IReverbProps = {
  mix: number; // 0-1 (dry/wet)
  decayTime: number; // 0.1-10 seconds
  preDelay: number; // 0-100 ms
  type: ReverbType;
};

export type IReverb = Module<ModuleType.Reverb>;

// ============================================================================
// Schema
// ============================================================================

export const reverbPropSchema: ModulePropSchema<
  IReverbProps,
  { type: { kind: "enum"; options: ReverbType[] } }
> = {
  mix: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Mix",
  },
  decayTime: {
    kind: "number",
    min: 0.1,
    max: 10,
    step: 0.1,
    exp: 2,
    label: "Decay Time",
  },
  preDelay: {
    kind: "number",
    min: 0,
    max: 100,
    step: 1,
    label: "Pre-delay",
  },
  type: {
    kind: "enum",
    options: [
      ReverbType.room,
      ReverbType.hall,
      ReverbType.plate,
      ReverbType.spring,
      ReverbType.chamber,
      ReverbType.reflections,
    ],
  },
};

const DEFAULT_REVERB_PROPS: IReverbProps = {
  mix: 0.3,
  decayTime: 1.5,
  preDelay: 0,
  type: ReverbType.room,
};

// ============================================================================
// Impulse Response Generation
// ============================================================================

function generateImpulseResponse(
  context: Context,
  type: ReverbType,
  decayTime: number,
): AudioBuffer {
  const sampleRate = context.audioContext.sampleRate;

  // Special handling for reflections - use short buffer
  const effectiveDecayTime =
    type === ReverbType.reflections
      ? Math.min(decayTime, 0.2) // Max 200ms for reflections
      : decayTime;

  const length = Math.floor(sampleRate * effectiveDecayTime);
  const buffer = context.audioContext.createBuffer(2, length, sampleRate);

  // Room type tuning parameters
  const tuning = getRoomTuning(type);

  // Reflections type uses discrete early reflections
  if (type === ReverbType.reflections) {
    generateEarlyReflections(buffer, sampleRate, tuning);
  } else {
    // Standard diffuse reverb tail
    generateDiffuseTail(buffer, sampleRate, length, tuning);
  }

  // Normalize
  normalizeBuffer(buffer);

  return buffer;
}

// Generate discrete early reflections for small spaces
function generateEarlyReflections(
  buffer: AudioBuffer,
  sampleRate: number,
  tuning: { decayFactor: number; damping: number; cutoff: number },
) {
  // Reflection times in milliseconds (psychoacoustic early reflection pattern)
  const reflectionTimes = [
    0, 7, 11, 17, 23, 31, 41, 47, 59, 67, 79, 89, 103, 127,
  ];

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);

    // Add slight variation between channels for stereo width
    const channelOffset = channel * 2.3;

    for (const reflectionMs of reflectionTimes) {
      const time = (reflectionMs + channelOffset) / 1000;
      const position = Math.floor(time * sampleRate);

      if (position >= data.length) break;

      // Each reflection has a short burst
      const burstLength = Math.floor(sampleRate * 0.003); // 3ms burst
      const amplitude = Math.exp(-time * tuning.decayFactor);

      for (let i = 0; i < burstLength && position + i < data.length; i++) {
        const noise = Math.random() * 2 - 1;
        const envelope = Math.exp(-i / (burstLength * 0.3)); // Quick decay within burst
        data[position + i] = data[position + i]! + noise * amplitude * envelope;
      }
    }

    // Apply lowpass filter
    applyLowpass(data, tuning.cutoff);
  }
}

// Generate standard diffuse reverb tail
function generateDiffuseTail(
  buffer: AudioBuffer,
  sampleRate: number,
  length: number,
  tuning: { decayFactor: number; damping: number; cutoff: number },
) {
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      // White noise
      const noise = Math.random() * 2 - 1;

      // Exponential decay
      const time = i / sampleRate;
      const decay = Math.exp(-time * tuning.decayFactor);

      // High-frequency damping (simple one-pole lowpass)
      const damping = 1 - tuning.damping * (i / length);

      data[i] = noise * decay * damping;
    }

    // Apply simple lowpass filter for damping
    applyLowpass(data, tuning.cutoff);
  }
}

function getRoomTuning(type: ReverbType) {
  switch (type) {
    case ReverbType.room:
      // Small to medium space - intimate, clear
      return {
        decayFactor: 3, // Moderate decay (~1-2s)
        damping: 0.5, // Moderate high-freq loss
        cutoff: 0.7, // Moderate brightness
      };

    case ReverbType.hall:
      // Large concert hall - spacious, smooth, long decay
      return {
        decayFactor: 1.5, // Slower decay (longer reverb tail)
        damping: 0.3, // Less damping (preserve highs longer)
        cutoff: 0.85, // Brighter (less filtering)
      };

    case ReverbType.plate:
      // Vintage plate reverb - bright, dense, metallic
      return {
        decayFactor: 2.5, // Medium decay
        damping: 0.2, // Very little damping (bright character)
        cutoff: 0.9, // Very bright (minimal filtering)
      };

    case ReverbType.spring:
      // Vintage spring reverb - metallic, bright, resonant
      return {
        decayFactor: 4, // Fast decay (spring tanks have quick decay)
        damping: 0.1, // Very little damping (bright, metallic)
        cutoff: 0.95, // Very bright (minimal filtering, metallic character)
      };

    case ReverbType.chamber:
      // Echo chamber - medium-large space, smooth, diffuse
      return {
        decayFactor: 2.0, // Medium decay
        damping: 0.35, // Moderate damping
        cutoff: 0.75, // Moderate brightness
      };

    case ReverbType.reflections:
      // Early reflections only - small space acoustics
      return {
        decayFactor: 5, // Fast decay for discrete reflections
        damping: 0.4, // Moderate damping
        cutoff: 0.8, // Fairly bright
      };

    default:
      return {
        decayFactor: 3,
        damping: 0.5,
        cutoff: 0.7,
      };
  }
}

function applyLowpass(data: Float32Array, cutoff: number) {
  let y1 = 0;
  const a = 1 - cutoff; // Simple coefficient

  for (let i = 0; i < data.length; i++) {
    const sample = data[i]!;
    y1 = a * sample + (1 - a) * y1;
    data[i] = y1;
  }
}

function normalizeBuffer(buffer: AudioBuffer) {
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    let max = 0;

    // Find peak
    for (const sample of data) {
      max = Math.max(max, Math.abs(sample));
    }

    // Normalize to 0.5 (avoid clipping)
    if (max > 0) {
      const scale = 0.5 / max;
      for (let i = 0; i < data.length; i++) {
        data[i] = data[i]! * scale;
      }
    }
  }
}

// ============================================================================
// Module Class
// ============================================================================

export default class Reverb
  extends Module<ModuleType.Reverb>
  implements
    Pick<
      SetterHooks<IReverbProps>,
      | "onAfterSetMix"
      | "onAfterSetDecayTime"
      | "onAfterSetPreDelay"
      | "onAfterSetType"
    >
{
  // Audio graph nodes
  declare audioNode: GainNode; // Input node
  private outputNode: GainNode; // Final output node
  private convolverNode: ConvolverNode;
  private preDelayNode: DelayNode;
  private wetDryMixer: WetDryMixer;

  constructor(engineId: string, params: ICreateModule<ModuleType.Reverb>) {
    const props = { ...DEFAULT_REVERB_PROPS, ...params.props };

    // Input node (this will be audioNode for Module interface)
    const audioNodeConstructor = (context: Context) =>
      context.audioContext.createGain();

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    // Set input gain
    this.audioNode.gain.value = 1;

    // Create wet/dry mixer
    this.wetDryMixer = new WetDryMixer(this.context);

    // Create audio processing nodes
    this.convolverNode = this.context.audioContext.createConvolver();
    this.preDelayNode = this.context.audioContext.createDelay(0.1); // 100ms max

    // Connect graph:
    // audioNode (input) -> wetDryMixer (dry path)
    //                   -> preDelay -> convolver -> wetDryMixer (wet path)
    // wetDryMixer -> outputNode
    this.wetDryMixer.connectInput(this.audioNode);
    this.audioNode.connect(this.preDelayNode);
    this.preDelayNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetDryMixer.getWetInput());
    this.outputNode = this.wetDryMixer.getOutput();

    // Generate initial impulse response
    this.regenerateImpulseResponse();

    // Set initial parameters
    this.wetDryMixer.setMix(props.mix);
    this.preDelayNode.delayTime.value = props.preDelay / 1000;

    this.registerDefaultIOs("in");
    this.registerCustomOutput();
  }

  private registerCustomOutput() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputNode,
    });
  }

  // ============================================================================
  // SetterHooks
  // ============================================================================

  onAfterSetMix = (value: number) => {
    this.wetDryMixer.setMix(value);
  };

  onAfterSetDecayTime = () => {
    this.regenerateImpulseResponse();
  };

  onAfterSetPreDelay = (value: number) => {
    this.preDelayNode.delayTime.value = value / 1000; // ms to seconds
  };

  onAfterSetType = () => {
    this.regenerateImpulseResponse();
  };

  // ============================================================================
  // Private Methods
  // ============================================================================

  private regenerateImpulseResponse() {
    const impulse = generateImpulseResponse(
      this.context,
      this.props.type,
      this.props.decayTime,
    );
    this.convolverNode.buffer = impulse;
  }
}
