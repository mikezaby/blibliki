import { ContextBase } from "./ContextBase.js";

export type AnyAudioContext = AudioContext | OfflineAudioContext;
export type ContextOptions = AudioContextOptions;

const isAudioContext = (
  value: AnyAudioContext | ContextOptions | undefined,
): value is AnyAudioContext =>
  value instanceof window.AudioContext ||
  value instanceof window.OfflineAudioContext;

export class Context extends ContextBase<AnyAudioContext> {
  constructor(contextOrOptions?: AnyAudioContext | ContextOptions) {
    super(
      isAudioContext(contextOrOptions)
        ? contextOrOptions
        : new window.AudioContext(contextOrOptions),
    );
  }

  newAudioWorklet(name: string): AudioWorkletNode {
    return new window.AudioWorkletNode(this.audioContext, name);
  }
}
