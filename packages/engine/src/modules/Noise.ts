import { ContextTime } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { AudioBufferSourceNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import { SetterHooks } from "@/core/module/Module";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type INoise = IModule<ModuleType.Noise>;

export enum NoiseType {
  white = "white",
  pink = "pink",
  brown = "brown",
  blue = "blue",
}

/**
 * Props for the Noise module.
 *
 * @property type - Type of noise to generate.
 *                  One of: "white", "pink", "brown", or "blue".
 */
export type INoiseProps = {
  type: NoiseType;
};

export const noisePropSchema: ModulePropSchema<
  INoiseProps,
  {
    type: EnumProp<NoiseType>;
  }
> = {
  type: {
    kind: "enum",
    options: Object.values(NoiseType),
    label: "Type",
  },
};

const DEFAULT_PROPS: INoiseProps = {
  type: NoiseType.white,
};

type NoiseSetterHooks = Pick<SetterHooks<INoiseProps>, "onAfterSetType">;

/**
 * Generates a buffer containing white noise.
 */
function generateWhiteNoise(
  context: BaseAudioContext,
  duration: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  return buffer;
}

/**
 * Generates a buffer containing pink noise using the Voss-McCartney algorithm.
 * Pink noise has equal energy per octave (1/f spectrum).
 */
function generatePinkNoise(
  context: BaseAudioContext,
  duration: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);

    // Paul Kellet pink noise generator state
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;

      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;

      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;

      data[i] = pink * 0.11; // Scale to approximately -1 to 1
    }
  }

  return buffer;
}

/**
 * Generates a buffer containing brown noise (Brownian/red noise).
 * Brown noise has a 1/f² spectrum with heavy low-end emphasis.
 */
function generateBrownNoise(
  context: BaseAudioContext,
  duration: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let lastOut = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + white * 0.02) * 0.99;
      data[i] = lastOut * 3.5; // Scale to approximately -1 to 1
    }
  }

  return buffer;
}

/**
 * Generates a buffer containing blue noise.
 * Blue noise emphasizes high frequencies (opposite of pink noise).
 */
function generateBlueNoise(
  context: BaseAudioContext,
  duration: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let lastWhite = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Blue noise is the derivative of white noise
      data[i] = (white - lastWhite) * 0.5;
      lastWhite = white;
    }
  }

  return buffer;
}

/**
 * Noise generator module supporting white, pink, brown, and blue noise types.
 */
export default class Noise
  extends Module<ModuleType.Noise>
  implements NoiseSetterHooks
{
  declare audioNode: AudioBufferSourceNode;
  isStated = false;
  private noiseBuffers: Map<NoiseType, AudioBuffer>;

  constructor(engineId: string, params: ICreateModule<ModuleType.Noise>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) => {
      const node = new AudioBufferSourceNode(context.audioContext);
      return node;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    // Pre-generate all noise buffers (2 seconds of noise, looped)
    const bufferDuration = 2;
    this.noiseBuffers = new Map<NoiseType, AudioBuffer>([
      [
        NoiseType.white,
        generateWhiteNoise(this.context.audioContext, bufferDuration),
      ],
      [
        NoiseType.pink,
        generatePinkNoise(this.context.audioContext, bufferDuration),
      ],
      [
        NoiseType.brown,
        generateBrownNoise(this.context.audioContext, bufferDuration),
      ],
      [
        NoiseType.blue,
        generateBlueNoise(this.context.audioContext, bufferDuration),
      ],
    ]);

    // Set the initial buffer
    this.audioNode.buffer = this.noiseBuffers.get(props.type)!;
    this.audioNode.loop = true;

    this.registerDefaultIOs("out");
  }

  onAfterSetType: NoiseSetterHooks["onAfterSetType"] = (type) => {
    const wasStarted = this.isStated;
    const currentTime = this.context.audioContext.currentTime;

    if (wasStarted) {
      this.stop(currentTime);
    }

    // Replace the audio node with a new one using the selected buffer
    this.rePlugAll(() => {
      this.audioNode = new AudioBufferSourceNode(this.context.audioContext, {
        buffer: this.noiseBuffers.get(type)!,
        loop: true,
      });
    });

    if (wasStarted) {
      this.start(currentTime);
    }
  };

  start(time: ContextTime) {
    if (this.isStated) return;

    this.isStated = true;
    this.audioNode.start(time);
  }

  stop(time: ContextTime) {
    if (!this.isStated) return;

    this.audioNode.stop(time);
    this.rePlugAll(() => {
      this.audioNode = new AudioBufferSourceNode(this.context.audioContext, {
        buffer: this.noiseBuffers.get(this.props.type)!,
        loop: true,
      });
    });

    this.isStated = false;
  }
}
