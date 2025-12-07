import {
  AudioContext,
  OfflineAudioContext,
  AudioWorkletNode,
} from "node-web-audio-api";
import { ContextBase } from "./ContextBase.js";

export type AnyAudioContext = AudioContext | OfflineAudioContext;

export class Context extends ContextBase<AnyAudioContext> {
  constructor(context?: AnyAudioContext) {
    super(context ?? new AudioContext());
  }

  newAudioWorklet(name: string): AudioWorkletNode {
    return new AudioWorkletNode(this.audioContext, name);
  }
}
