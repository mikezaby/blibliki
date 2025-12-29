import { Context } from "@blibliki/utils";
import { ModulePropSchema } from "@/core";
import { Module, SetterHooks } from "@/core/module/Module";
import { ICreateModule, ModuleType } from ".";

// ============================================================================
// Types
// ============================================================================

export enum ReverbType {
  room = "room",
  hall = "hall",
  plate = "plate",
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
    options: [ReverbType.room, ReverbType.hall, ReverbType.plate],
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
  const length = Math.floor(sampleRate * decayTime);
  const buffer = context.audioContext.createBuffer(2, length, sampleRate);

  // Room type tuning parameters
  const tuning = getRoomTuning(type);

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

  // Normalize
  normalizeBuffer(buffer);

  return buffer;
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
  declare audioNode: GainNode; // Input splitter node
  private outputNode: GainNode; // Final output node
  private convolverNode: ConvolverNode;
  private preDelayNode: DelayNode;
  private dryGainNode: GainNode;
  private wetGainNode: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Reverb>) {
    const props = { ...DEFAULT_REVERB_PROPS, ...params.props };

    // Input splitter node (this will be audioNode for Module interface)
    const audioNodeConstructor = (context: Context) =>
      context.audioContext.createGain();

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    // Set input splitter gain
    this.audioNode.gain.value = 1;

    // Create audio graph
    this.outputNode = this.context.audioContext.createGain();
    this.outputNode.gain.value = 1;
    this.convolverNode = this.context.audioContext.createConvolver();
    this.preDelayNode = this.context.audioContext.createDelay(0.1); // 100ms max
    this.dryGainNode = this.context.audioContext.createGain();
    this.wetGainNode = this.context.audioContext.createGain();

    // Connect graph:
    // audioNode (input) -> preDelay -> convolver -> wetGain -> outputNode
    //                   -> dryGain -> outputNode
    this.audioNode.connect(this.preDelayNode);
    this.audioNode.connect(this.dryGainNode);
    this.preDelayNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    this.wetGainNode.connect(this.outputNode);
    this.dryGainNode.connect(this.outputNode);

    // Generate initial impulse response
    this.regenerateImpulseResponse();

    // Set initial parameters
    this.updateMixGains(props.mix);
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
    this.updateMixGains(value);
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

  private updateMixGains(mix: number) {
    // Equal-power crossfade
    const dryGain = Math.cos((mix * Math.PI) / 2);
    const wetGain = Math.sin((mix * Math.PI) / 2);

    this.dryGainNode.gain.value = dryGain;
    this.wetGainNode.gain.value = wetGain;
  }

  private regenerateImpulseResponse() {
    const impulse = generateImpulseResponse(
      this.context,
      this.props.type,
      this.props.decayTime,
    );
    this.convolverNode.buffer = impulse;
  }
}
