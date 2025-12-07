import { ContextBase } from "./ContextBase.js";

export type AnyAudioContext = AudioContext | OfflineAudioContext;

export class Context extends ContextBase<AnyAudioContext> {
  constructor(context?: AnyAudioContext) {
    super(context ?? new window.AudioContext());
  }

  newAudioWorklet(name: string): AudioWorkletNode {
    return new window.AudioWorkletNode(this.audioContext, name);
  }
}
