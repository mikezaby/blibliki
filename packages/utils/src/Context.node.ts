import {
  AudioContext,
  OfflineAudioContext,
  AudioWorkletNode,
} from "node-web-audio-api";
import { ContextBase } from "./ContextBase.js";

export type AnyAudioContext = AudioContext | OfflineAudioContext;
export type ContextOptions = AudioContextOptions;

const isAudioContext = (
  value: AnyAudioContext | ContextOptions | undefined,
): value is AnyAudioContext =>
  value instanceof AudioContext || value instanceof OfflineAudioContext;

export class Context extends ContextBase<AnyAudioContext> {
  constructor(contextOrOptions?: AnyAudioContext | ContextOptions) {
    super(
      isAudioContext(contextOrOptions)
        ? contextOrOptions
        : new AudioContext(contextOrOptions),
    );
  }

  newAudioWorklet(name: string): AudioWorkletNode {
    return new AudioWorkletNode(this.audioContext, name);
  }
}
