import { ContextTime, Seconds } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SignalsmithStretch from "signalsmith-stretch";
import { IModule, Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type ISampler = IModule<ModuleType.Sampler>;
export type ISamplerProps = {
  sampleUrl: string;
  rate: number;
  semitones: number;
  rootMidi: number;
  gain: number;
  startOffset: number;
  endOffset: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  reverse: boolean;
  oneShot: boolean;
  attack: number;
  release: number;
};

export const samplerPropSchema: ModulePropSchema<ISamplerProps> = {
  sampleUrl: {
    kind: "string",
    label: "Online Sample URL",
  },
  rate: {
    kind: "number",
    min: 0.1,
    max: 4,
    step: 0.01,
    label: "Rate",
  },
  semitones: {
    kind: "number",
    min: -48,
    max: 48,
    step: 1,
    label: "Semitones",
  },
  rootMidi: {
    kind: "number",
    min: 0,
    max: 127,
    step: 1,
    label: "Root MIDI",
  },
  gain: {
    kind: "number",
    min: 0,
    max: 2,
    step: 0.01,
    label: "Gain",
  },
  startOffset: {
    kind: "number",
    min: 0,
    max: 0.99,
    step: 0.001,
    label: "Start",
  },
  endOffset: {
    kind: "number",
    min: 0.01,
    max: 1,
    step: 0.001,
    label: "End",
  },
  loop: {
    kind: "boolean",
    label: "Loop",
  },
  loopStart: {
    kind: "number",
    min: 0,
    max: 0.99,
    step: 0.001,
    label: "Loop Start",
  },
  loopEnd: {
    kind: "number",
    min: 0.01,
    max: 1,
    step: 0.001,
    label: "Loop End",
  },
  reverse: {
    kind: "boolean",
    label: "Reverse",
  },
  oneShot: {
    kind: "boolean",
    label: "One Shot",
  },
  attack: {
    kind: "number",
    min: 0,
    max: 2,
    step: 0.001,
    label: "Attack",
  },
  release: {
    kind: "number",
    min: 0,
    max: 5,
    step: 0.001,
    label: "Release",
  },
};

type SamplerScheduleProps = {
  output: Seconds;
  active: boolean;
  input: Seconds;
  rate: number;
  semitones: number;
  tonalityHz: number;
  loopStart: Seconds;
  loopEnd: Seconds;
};

type SamplerNode = AudioNode & {
  start: (t: number) => void;
  stop: (t: number) => void;
  schedule: (props: Partial<SamplerScheduleProps>) => void;
};

type ActiveVoice = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
};

const DEFAULT_PROPS: ISamplerProps = {
  sampleUrl: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3",
  rate: 1,
  semitones: 0,
  rootMidi: 60,
  gain: 1,
  startOffset: 0,
  endOffset: 1,
  loop: false,
  loopStart: 0,
  loopEnd: 1,
  reverse: false,
  oneShot: true,
  attack: 0.001,
  release: 0.05,
};

const MIN_SLICE_SECONDS = 0.005;
const SOURCE_STOP_EPSILON = 0.005;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

export class MonoSampler extends Module<ModuleType.Sampler> {
  declare audioNode: GainNode;
  samplerNode?: SamplerNode;
  isStarted = false;
  private sampleBuffer?: AudioBuffer;
  private reversedSampleBuffer?: AudioBuffer;
  private loadingGeneration = 0;
  private activeVoices = new Map<string, ActiveVoice>();

  constructor(engineId: string, params: ICreateModule<ModuleType.Sampler>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      context.audioContext.createGain();

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    this.audioNode.gain.value = props.gain;
    void this.initializeStretchNode();
    void this.loadSampleFromUrl(props.sampleUrl);

    this.registerOutputs();
  }

  start(time: ContextTime) {
    if (this.isStarted) return;

    this.isStarted = true;
    if (this.samplerNode) {
      this.samplerNode.start(time);
    }

    // Keep track of transport state. Sources are started on MIDI note-on.
    this.onAfterSetRate(this.props.rate);
    this.onAfterSetSemitones(this.props.semitones);
  }

  stop(time: ContextTime) {
    if (!this.isStarted) return;

    this.stopAllVoices(time);
    if (this.samplerNode) {
      this.samplerNode.stop(time);
    }

    this.isStarted = false;
  }

  triggerAttack(note: Note, triggeredAt: ContextTime) {
    super.triggerAttack(note, triggeredAt);
    this.start(triggeredAt);

    if (!this.sampleBuffer) return;

    const buffer = this.getPlaybackBuffer();
    if (!buffer) return;

    const start = this.getNormalizedStart();
    const end = this.getNormalizedEnd(start);
    const loopStart = this.getNormalizedLoopStart(start, end);
    const loopEnd = this.getNormalizedLoopEnd(loopStart, end);

    const source = this.context.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(
      this.getSourcePlaybackRate(note),
      triggeredAt,
    );

    if (this.props.loop && !this.props.oneShot) {
      source.loop = true;
      source.loopStart = this.normalizedToSeconds(buffer.duration, loopStart);
      source.loopEnd = this.normalizedToSeconds(buffer.duration, loopEnd);
    }

    const voiceGain = this.context.audioContext.createGain();
    const velocity = clamp(note.velocity, 0, 1);
    const targetGain = velocity;
    const attack = Math.max(0, this.props.attack);

    voiceGain.gain.setValueAtTime(0, triggeredAt);
    if (attack === 0) {
      voiceGain.gain.setValueAtTime(targetGain, triggeredAt);
    } else {
      voiceGain.gain.linearRampToValueAtTime(targetGain, triggeredAt + attack);
    }

    source.connect(voiceGain);
    voiceGain.connect(this.getPlaybackDestination());

    const noteKey = note.fullName;
    this.stopVoice(noteKey, triggeredAt);
    this.activeVoices.set(noteKey, { source, gainNode: voiceGain });

    source.onended = () => {
      const active = this.activeVoices.get(noteKey);
      if (active?.source === source) {
        this.activeVoices.delete(noteKey);
      }
    };

    const startSeconds = this.normalizedToSeconds(buffer.duration, start);
    const endSeconds = this.normalizedToSeconds(buffer.duration, end);
    const duration = Math.max(MIN_SLICE_SECONDS, endSeconds - startSeconds);

    if (this.props.loop && !this.props.oneShot) {
      source.start(triggeredAt, startSeconds);
      return;
    }

    source.start(triggeredAt, startSeconds, duration);
  }

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    if (this.props.oneShot) return;

    this.stopVoice(note.fullName, triggeredAt);
  }

  onAfterSetSampleUrl: SetterHooks<ISamplerProps>["onAfterSetSampleUrl"] = (
    value,
  ) => {
    void this.loadSampleFromUrl(value);
  };

  onAfterSetGain: SetterHooks<ISamplerProps>["onAfterSetGain"] = (value) => {
    this.audioNode.gain.value = value;
  };

  onAfterSetReverse: SetterHooks<ISamplerProps>["onAfterSetReverse"] = () => {
    this.reversedSampleBuffer = undefined;
  };

  onAfterSetRate: SetterHooks<ISamplerProps>["onAfterSetRate"] = (value) => {
    if (!this.samplerNode) return;

    this.samplerNode.schedule({ rate: value });
  };

  onAfterSetSemitones: SetterHooks<ISamplerProps>["onAfterSetSemitones"] = (
    value,
  ) => {
    if (!this.samplerNode) return;

    this.samplerNode.schedule({ semitones: value });
  };

  override dispose() {
    this.stopAllVoices(this.context.currentTime);
    super.dispose();
  }

  private getNormalizedStart() {
    return clamp(this.props.startOffset, 0, 0.999);
  }

  private getNormalizedEnd(start: number) {
    return clamp(this.props.endOffset, start + 0.001, 1);
  }

  private getNormalizedLoopStart(start: number, end: number) {
    return clamp(this.props.loopStart, start, Math.max(start, end - 0.001));
  }

  private getNormalizedLoopEnd(loopStart: number, end: number) {
    return clamp(this.props.loopEnd, loopStart + 0.001, end);
  }

  private normalizedToSeconds(totalDuration: Seconds, normalized: number) {
    return totalDuration * clamp(normalized, 0, 1);
  }

  private getSourcePlaybackRate(note: Note) {
    const noteOffset = note.midiNumber - this.props.rootMidi;
    const noteTransposeRate = Math.pow(2, noteOffset / 12);
    if (this.samplerNode) return noteTransposeRate;

    const semitoneRate = Math.pow(2, this.props.semitones / 12);
    return this.props.rate * semitoneRate * noteTransposeRate;
  }

  private getPlaybackBuffer() {
    if (!this.sampleBuffer) return undefined;
    if (!this.props.reverse) return this.sampleBuffer;

    if (this.reversedSampleBuffer) return this.reversedSampleBuffer;

    const source = this.sampleBuffer;
    const reversed = this.context.audioContext.createBuffer(
      source.numberOfChannels,
      source.length,
      source.sampleRate,
    );

    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      const sourceData = source.getChannelData(channel);
      const targetData = reversed.getChannelData(channel);
      for (let i = 0; i < sourceData.length; i += 1) {
        targetData[i] = sourceData[sourceData.length - i - 1] ?? 0;
      }
    }

    this.reversedSampleBuffer = reversed;
    return reversed;
  }

  private getPlaybackDestination() {
    return this.samplerNode ?? this.audioNode;
  }

  private stopVoice(noteKey: string, triggeredAt: ContextTime) {
    const voice = this.activeVoices.get(noteKey);
    if (!voice) return;

    this.activeVoices.delete(noteKey);
    const release = Math.max(0, this.props.release);

    try {
      voice.gainNode.gain.cancelScheduledValues(triggeredAt);
      const currentValue = voice.gainNode.gain.value;
      voice.gainNode.gain.setValueAtTime(currentValue, triggeredAt);
      voice.gainNode.gain.linearRampToValueAtTime(0, triggeredAt + release);

      voice.source.stop(triggeredAt + release + SOURCE_STOP_EPSILON);
    } catch {
      voice.source.stop(triggeredAt);
    }
  }

  private stopAllVoices(triggeredAt: ContextTime) {
    const activeNoteKeys = Array.from(this.activeVoices.keys());
    activeNoteKeys.forEach((noteKey) => {
      this.stopVoice(noteKey, triggeredAt);
    });
  }

  private async initializeStretchNode() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.samplerNode = (await SignalsmithStretch(
        this.context.audioContext,
      )) as SamplerNode;

      this.samplerNode.connect(this.audioNode);
      this.samplerNode.schedule({
        rate: this.props.rate,
        semitones: this.props.semitones,
      });
      if (this.isStarted) {
        this.samplerNode.start(this.context.currentTime);
      }
    } catch {
      this.samplerNode = undefined;
    }
  }

  private async loadSampleFromUrl(rawUrl: string) {
    const sampleUrl = rawUrl.trim();
    const generation = ++this.loadingGeneration;

    this.stopAllVoices(this.context.currentTime);
    this.sampleBuffer = undefined;
    this.reversedSampleBuffer = undefined;

    if (!sampleUrl) return;

    try {
      const response = await fetch(sampleUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sample: ${response.status}`);
      }

      const data = await response.arrayBuffer();
      const decoded = await this.context.audioContext.decodeAudioData(
        data.slice(0),
      );

      if (generation !== this.loadingGeneration) return;

      this.sampleBuffer = decoded;
    } catch {
      if (generation !== this.loadingGeneration) return;
      this.sampleBuffer = undefined;
      this.reversedSampleBuffer = undefined;
    }
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.audioNode,
    });
  }
}

export default class Sampler extends PolyModule<ModuleType.Sampler> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Sampler>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Sampler>,
    ) => new MonoSampler(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs("out");
  }

  start(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.start(time);
    });
  }

  stop(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.stop(time);
    });
  }
}
