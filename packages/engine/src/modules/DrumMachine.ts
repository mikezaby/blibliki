import { ContextTime } from "@blibliki/transport";
import {
  AudioBufferSourceNode,
  BiquadFilterNode,
  GainNode,
  OscillatorNode,
} from "@blibliki/utils/web-audio-api";
import { IModule, Module, SetterHooks } from "@/core";
import Note from "@/core/Note";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IDrumMachine = IModule<ModuleType.DrumMachine>;

type DrumVoice =
  | "kick"
  | "snare"
  | "tom"
  | "cymbal"
  | "cowbell"
  | "clap"
  | "openHat"
  | "closedHat";

const DRUM_VOICES = [
  "kick",
  "snare",
  "tom",
  "cymbal",
  "cowbell",
  "clap",
  "openHat",
  "closedHat",
] as const satisfies readonly DrumVoice[];

const OUTPUT_NAMES: Record<DrumVoice, string> = {
  kick: "kick out",
  snare: "snare out",
  tom: "tom out",
  cymbal: "cymbal out",
  cowbell: "cowbell out",
  clap: "clap out",
  openHat: "open hat out",
  closedHat: "closed hat out",
};

const NOTE_TO_VOICE: Record<number, DrumVoice> = {
  36: "kick",
  38: "snare",
  39: "clap",
  42: "closedHat",
  45: "tom",
  46: "openHat",
  49: "cymbal",
  56: "cowbell",
};

const VOICE_PROP_KEYS = {
  kick: { level: "kickLevel", decay: "kickDecay", tone: "kickTone" },
  snare: { level: "snareLevel", decay: "snareDecay", tone: "snareTone" },
  tom: { level: "tomLevel", decay: "tomDecay", tone: "tomTone" },
  cymbal: {
    level: "cymbalLevel",
    decay: "cymbalDecay",
    tone: "cymbalTone",
  },
  cowbell: {
    level: "cowbellLevel",
    decay: "cowbellDecay",
    tone: "cowbellTone",
  },
  clap: { level: "clapLevel", decay: "clapDecay", tone: "clapTone" },
  openHat: {
    level: "openHatLevel",
    decay: "openHatDecay",
    tone: "openHatTone",
  },
  closedHat: {
    level: "closedHatLevel",
    decay: "closedHatDecay",
    tone: "closedHatTone",
  },
} satisfies Record<
  DrumVoice,
  {
    level: keyof IDrumMachineProps;
    decay: keyof IDrumMachineProps;
    tone: keyof IDrumMachineProps;
  }
>;

const MIN_ENVELOPE_GAIN = 0.0001;
const ATTACK_TIME = 0.002;
const CLEANUP_TAIL = 0.1;

export type IDrumMachineProps = {
  masterLevel: number;
  kickLevel: number;
  kickDecay: number;
  kickTone: number;
  snareLevel: number;
  snareDecay: number;
  snareTone: number;
  tomLevel: number;
  tomDecay: number;
  tomTone: number;
  cymbalLevel: number;
  cymbalDecay: number;
  cymbalTone: number;
  cowbellLevel: number;
  cowbellDecay: number;
  cowbellTone: number;
  clapLevel: number;
  clapDecay: number;
  clapTone: number;
  openHatLevel: number;
  openHatDecay: number;
  openHatTone: number;
  closedHatLevel: number;
  closedHatDecay: number;
  closedHatTone: number;
};

const numberProp = (
  label: string,
  shortLabel: string,
  min: number,
  max: number,
  step: number,
): {
  kind: "number";
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  step: number;
} => ({
  kind: "number",
  label,
  shortLabel,
  min,
  max,
  step,
});

export const drumMachinePropSchema: ModulePropSchema<IDrumMachineProps> = {
  masterLevel: numberProp("Master Level", "mst", 0, 1.5, 0.01),
  kickLevel: numberProp("Kick Level", "k-l", 0, 1.5, 0.01),
  kickDecay: numberProp("Kick Decay", "k-d", 0.01, 4, 0.01),
  kickTone: numberProp("Kick Tone", "k-t", 0, 1, 0.01),
  snareLevel: numberProp("Snare Level", "s-l", 0, 1.5, 0.01),
  snareDecay: numberProp("Snare Decay", "s-d", 0.01, 4, 0.01),
  snareTone: numberProp("Snare Tone", "s-t", 0, 1, 0.01),
  tomLevel: numberProp("Tom Level", "t-l", 0, 1.5, 0.01),
  tomDecay: numberProp("Tom Decay", "t-d", 0.01, 4, 0.01),
  tomTone: numberProp("Tom Tone", "t-t", 0, 1, 0.01),
  cymbalLevel: numberProp("Cymbal Level", "c-l", 0, 1.5, 0.01),
  cymbalDecay: numberProp("Cymbal Decay", "c-d", 0.01, 4, 0.01),
  cymbalTone: numberProp("Cymbal Tone", "c-t", 0, 1, 0.01),
  cowbellLevel: numberProp("Cowbell Level", "cb-l", 0, 1.5, 0.01),
  cowbellDecay: numberProp("Cowbell Decay", "cb-d", 0.01, 4, 0.01),
  cowbellTone: numberProp("Cowbell Tone", "cb-t", 0, 1, 0.01),
  clapLevel: numberProp("Clap Level", "cl-l", 0, 1.5, 0.01),
  clapDecay: numberProp("Clap Decay", "cl-d", 0.01, 4, 0.01),
  clapTone: numberProp("Clap Tone", "cl-t", 0, 1, 0.01),
  openHatLevel: numberProp("Open Hat Level", "oh-l", 0, 1.5, 0.01),
  openHatDecay: numberProp("Open Hat Decay", "oh-d", 0.01, 4, 0.01),
  openHatTone: numberProp("Open Hat Tone", "oh-t", 0, 1, 0.01),
  closedHatLevel: numberProp("Closed Hat Level", "ch-l", 0, 1.5, 0.01),
  closedHatDecay: numberProp("Closed Hat Decay", "ch-d", 0.01, 4, 0.01),
  closedHatTone: numberProp("Closed Hat Tone", "ch-t", 0, 1, 0.01),
};

const DEFAULT_PROPS: IDrumMachineProps = {
  masterLevel: 1,
  kickLevel: 1,
  kickDecay: 0.5,
  kickTone: 0.5,
  snareLevel: 1,
  snareDecay: 0.4,
  snareTone: 0.5,
  tomLevel: 1,
  tomDecay: 0.5,
  tomTone: 0.5,
  cymbalLevel: 1,
  cymbalDecay: 1.5,
  cymbalTone: 0.5,
  cowbellLevel: 1,
  cowbellDecay: 0.5,
  cowbellTone: 0.5,
  clapLevel: 1,
  clapDecay: 0.4,
  clapTone: 0.5,
  openHatLevel: 1,
  openHatDecay: 0.8,
  openHatTone: 0.5,
  closedHatLevel: 1,
  closedHatDecay: 0.2,
  closedHatTone: 0.5,
};

const createVoiceBuses = (
  context: BaseAudioContext,
): Record<DrumVoice, GainNode> => ({
  kick: new GainNode(context),
  snare: new GainNode(context),
  tom: new GainNode(context),
  cymbal: new GainNode(context),
  cowbell: new GainNode(context),
  clap: new GainNode(context),
  openHat: new GainNode(context),
  closedHat: new GainNode(context),
});

type DisposableVoice = {
  outputGain: GainNode;
  cleanupAt: number;
  stop: (when: number) => void;
  dispose: () => void;
};

export default class DrumMachine
  extends Module<ModuleType.DrumMachine>
  implements Pick<SetterHooks<IDrumMachineProps>, "onAfterSetMasterLevel">
{
  declare audioNode: undefined;
  private readonly masterBus: GainNode;
  private readonly voiceBuses: Record<DrumVoice, GainNode>;
  private noiseBuffer?: AudioBuffer;
  private activeOpenHats = new Set<DisposableVoice>();

  constructor(engineId: string, params: ICreateModule<ModuleType.DrumMachine>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.masterBus = new GainNode(this.context.audioContext, {
      gain: props.masterLevel,
    });
    this.voiceBuses = createVoiceBuses(this.context.audioContext);

    Object.values(this.voiceBuses).forEach((voiceBus) => {
      voiceBus.connect(this.masterBus);
    });

    this.registerIOs();
  }

  onAfterSetMasterLevel: SetterHooks<IDrumMachineProps>["onAfterSetMasterLevel"] =
    (value) => {
      this.masterBus.gain.value = value;
    };

  triggerAttack(note: Note, triggeredAt: ContextTime): void {
    super.triggerAttack(note, triggeredAt);

    const voice = NOTE_TO_VOICE[note.midiNumber];
    if (!voice) return;

    this.playVoice(voice, note.velocity ?? 1, triggeredAt);
  }

  dispose() {
    this.activeOpenHats.forEach((voice) => voice.dispose());
    this.activeOpenHats.clear();

    Object.values(this.voiceBuses).forEach((voiceBus) => {
      voiceBus.disconnect();
    });
    this.masterBus.disconnect();
    super.dispose();
  }

  private registerIOs() {
    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });

    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.masterBus,
    });

    DRUM_VOICES.forEach((voice) => {
      this.registerAudioOutput({
        name: OUTPUT_NAMES[voice],
        getAudioNode: () => this.voiceBuses[voice],
      });
    });
  }

  private playVoice(
    voice: DrumVoice,
    velocity: number,
    triggeredAt: ContextTime,
  ) {
    switch (voice) {
      case "kick":
        this.triggerKick(velocity, triggeredAt);
        return;
      case "snare":
        this.triggerSnare(velocity, triggeredAt);
        return;
      case "tom":
        this.triggerTom(velocity, triggeredAt);
        return;
      case "cymbal":
        this.triggerCymbal(velocity, triggeredAt);
        return;
      case "cowbell":
        this.triggerCowbell(velocity, triggeredAt);
        return;
      case "clap":
        this.triggerClap(velocity, triggeredAt);
        return;
      case "openHat":
        this.triggerOpenHat(velocity, triggeredAt);
        return;
      case "closedHat":
        this.chokeOpenHats(triggeredAt);
        this.triggerClosedHat(velocity, triggeredAt);
        return;
    }
  }

  private triggerKick(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "kick",
      velocity,
    );
    const oscillator = new OscillatorNode(this.context.audioContext, {
      type: "sine",
      frequency: 140 + tone * 60,
    });

    oscillator.frequency.setValueAtTime(180 + tone * 60, triggeredAt);
    oscillator.frequency.exponentialRampToValueAtTime(
      45 + tone * 10,
      triggeredAt + Math.max(0.03, decay * 0.2),
    );
    oscillator.connect(outputGain);

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.12, decay * 0.6),
    );

    oscillator.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [oscillator],
      nodes: [oscillator, outputGain],
      cleanupAt,
    });
  }

  private triggerSnare(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "snare",
      velocity,
    );
    const noiseSource = this.createNoiseSource();
    const noiseFilter = new BiquadFilterNode(this.context.audioContext, {
      type: "highpass",
      frequency: 1200 + tone * 5000,
      Q: 0.7,
    });
    const bodyOscillator = new OscillatorNode(this.context.audioContext, {
      type: "triangle",
      frequency: 180 + tone * 120,
    });
    const bodyGain = new GainNode(this.context.audioContext, {
      gain: peak * 0.4,
    });

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(outputGain);
    bodyOscillator.connect(bodyGain);
    bodyGain.connect(outputGain);

    bodyOscillator.frequency.setValueAtTime(220 + tone * 100, triggeredAt);
    bodyOscillator.frequency.exponentialRampToValueAtTime(
      120 + tone * 40,
      triggeredAt + Math.max(0.02, decay * 0.12),
    );

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.08, decay * 0.55),
    );

    noiseSource.start(triggeredAt);
    bodyOscillator.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [noiseSource, bodyOscillator],
      nodes: [noiseSource, noiseFilter, bodyOscillator, bodyGain, outputGain],
      cleanupAt,
    });
  }

  private triggerTom(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "tom",
      velocity,
    );
    const oscillator = new OscillatorNode(this.context.audioContext, {
      type: "sine",
      frequency: 110 + tone * 110,
    });

    oscillator.frequency.setValueAtTime(170 + tone * 120, triggeredAt);
    oscillator.frequency.exponentialRampToValueAtTime(
      90 + tone * 40,
      triggeredAt + Math.max(0.04, decay * 0.2),
    );
    oscillator.connect(outputGain);

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.12, decay * 0.7),
    );

    oscillator.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [oscillator],
      nodes: [oscillator, outputGain],
      cleanupAt,
    });
  }

  private triggerCowbell(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "cowbell",
      velocity,
    );
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "bandpass",
      frequency: 1200 + tone * 1800,
      Q: 1.4,
    });
    const oscillatorA = new OscillatorNode(this.context.audioContext, {
      type: "square",
      frequency: 540 + tone * 80,
    });
    const oscillatorB = new OscillatorNode(this.context.audioContext, {
      type: "square",
      frequency: 845 + tone * 120,
    });

    oscillatorA.connect(filter);
    oscillatorB.connect(filter);
    filter.connect(outputGain);

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.08, decay * 0.45),
    );

    oscillatorA.start(triggeredAt);
    oscillatorB.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [oscillatorA, oscillatorB],
      nodes: [oscillatorA, oscillatorB, filter, outputGain],
      cleanupAt,
    });
  }

  private triggerClap(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "clap",
      velocity,
    );
    const noiseSource = this.createNoiseSource();
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "bandpass",
      frequency: 1500 + tone * 4200,
      Q: 0.8,
    });

    noiseSource.connect(filter);
    filter.connect(outputGain);

    const cleanupAt = this.scheduleClapEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.12, decay * 0.55),
    );

    noiseSource.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [noiseSource],
      nodes: [noiseSource, filter, outputGain],
      cleanupAt,
    });
  }

  private triggerCymbal(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "cymbal",
      velocity,
    );
    const noiseSource = this.createNoiseSource();
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "highpass",
      frequency: 3200 + tone * 5200,
      Q: 0.7,
    });

    noiseSource.connect(filter);
    filter.connect(outputGain);

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.25, decay * 0.9),
    );

    noiseSource.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [noiseSource],
      nodes: [noiseSource, filter, outputGain],
      cleanupAt,
    });
  }

  private triggerOpenHat(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "openHat",
      velocity,
    );
    const noiseSource = this.createNoiseSource();
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "highpass",
      frequency: 4200 + tone * 5000,
      Q: 0.8,
    });

    noiseSource.connect(filter);
    filter.connect(outputGain);

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.2, decay * 0.8),
    );

    noiseSource.start(triggeredAt);
    const voice = this.createDisposableVoice({
      outputGain,
      stoppers: [noiseSource],
      nodes: [noiseSource, filter, outputGain],
      cleanupAt,
      onDispose: () => {
        this.activeOpenHats.delete(voice);
      },
    });
    this.activeOpenHats.add(voice);
  }

  private triggerClosedHat(velocity: number, triggeredAt: ContextTime) {
    const { outputGain, peak, decay, tone } = this.createVoiceOutput(
      "closedHat",
      velocity,
    );
    const noiseSource = this.createNoiseSource();
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "highpass",
      frequency: 5000 + tone * 5500,
      Q: 1,
    });

    noiseSource.connect(filter);
    filter.connect(outputGain);

    const cleanupAt = this.scheduleDecayEnvelope(
      outputGain,
      peak,
      triggeredAt,
      Math.max(0.05, decay * 0.3),
    );

    noiseSource.start(triggeredAt);
    this.createDisposableVoice({
      outputGain,
      stoppers: [noiseSource],
      nodes: [noiseSource, filter, outputGain],
      cleanupAt,
    });
  }

  private chokeOpenHats(triggeredAt: ContextTime) {
    this.activeOpenHats.forEach((voice) => {
      const releaseAt = triggeredAt + 0.05;
      voice.outputGain.gain.cancelScheduledValues(triggeredAt);
      voice.outputGain.gain.setValueAtTime(
        Math.max(voice.outputGain.gain.value, MIN_ENVELOPE_GAIN),
        triggeredAt,
      );
      voice.outputGain.gain.exponentialRampToValueAtTime(
        MIN_ENVELOPE_GAIN,
        releaseAt,
      );
      voice.stop(releaseAt);
    });
  }

  private createVoiceOutput(voice: DrumVoice, velocity: number) {
    const { level, decay, tone } = this.getVoiceSettings(voice);
    const outputGain = new GainNode(this.context.audioContext, {
      gain: MIN_ENVELOPE_GAIN,
    });

    outputGain.connect(this.voiceBuses[voice]);

    return {
      outputGain,
      peak: Math.max(MIN_ENVELOPE_GAIN, level * this.normalizeVelocity(velocity)),
      decay,
      tone,
    };
  }

  private getVoiceSettings(voice: DrumVoice) {
    const keys = VOICE_PROP_KEYS[voice];
    return {
      level: this.props[keys.level],
      decay: this.props[keys.decay],
      tone: this.props[keys.tone],
    };
  }

  private normalizeVelocity(velocity: number) {
    const clampedVelocity = Math.min(1, Math.max(0, velocity));
    return 0.2 + clampedVelocity * 0.8;
  }

  private scheduleDecayEnvelope(
    outputGain: GainNode,
    peak: number,
    triggeredAt: ContextTime,
    decay: number,
  ) {
    outputGain.gain.cancelScheduledValues(triggeredAt);
    outputGain.gain.setValueAtTime(MIN_ENVELOPE_GAIN, triggeredAt);
    outputGain.gain.exponentialRampToValueAtTime(
      peak,
      triggeredAt + ATTACK_TIME,
    );
    outputGain.gain.exponentialRampToValueAtTime(
      MIN_ENVELOPE_GAIN,
      triggeredAt + decay,
    );

    return triggeredAt + decay + CLEANUP_TAIL;
  }

  private scheduleClapEnvelope(
    outputGain: GainNode,
    peak: number,
    triggeredAt: ContextTime,
    decay: number,
  ) {
    const gain = outputGain.gain;
    const burstInterval = 0.018;

    gain.cancelScheduledValues(triggeredAt);
    gain.setValueAtTime(MIN_ENVELOPE_GAIN, triggeredAt);

    [1, 0.75, 0.55].forEach((multiplier, index) => {
      const burstStart = triggeredAt + index * burstInterval;
      gain.setValueAtTime(MIN_ENVELOPE_GAIN, burstStart);
      gain.exponentialRampToValueAtTime(
        peak * multiplier,
        burstStart + ATTACK_TIME,
      );
      gain.exponentialRampToValueAtTime(
        MIN_ENVELOPE_GAIN,
        burstStart + burstInterval,
      );
    });

    const tailStart = triggeredAt + burstInterval * 3;
    gain.setValueAtTime(peak * 0.45, tailStart);
    gain.exponentialRampToValueAtTime(
      MIN_ENVELOPE_GAIN,
      tailStart + decay,
    );

    return tailStart + decay + CLEANUP_TAIL;
  }

  private createNoiseSource() {
    const noiseSource = new AudioBufferSourceNode(this.context.audioContext);
    noiseSource.buffer = this.getNoiseBuffer();
    return noiseSource;
  }

  private getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;

    const durationSeconds = 4;
    const sampleRate = this.context.audioContext.sampleRate;
    const length = sampleRate * durationSeconds;
    const buffer = this.context.audioContext.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  private createDisposableVoice({
    outputGain,
    stoppers,
    nodes,
    cleanupAt,
    onDispose,
  }: {
    outputGain: GainNode;
    stoppers: Array<AudioBufferSourceNode | OscillatorNode>;
    nodes: AudioNode[];
    cleanupAt: number;
    onDispose?: () => void;
  }): DisposableVoice {
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    let isDisposed = false;

    const dispose = () => {
      if (isDisposed) return;
      isDisposed = true;
      if (cleanupTimer) clearTimeout(cleanupTimer);

      stoppers.forEach((node) => {
        try {
          node.stop();
        } catch {
          // Node may have already stopped naturally.
        }
      });

      nodes.forEach((node) => {
        try {
          node.disconnect();
        } catch {
          // Ignore disconnect errors during cleanup.
        }
      });

      onDispose?.();
    };

    const scheduleCleanup = (at: number) => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(
        dispose,
        Math.max(
          0,
          (at - this.context.audioContext.currentTime) * 1000 +
            CLEANUP_TAIL * 1000,
        ),
      );
    };

    const voice: DisposableVoice = {
      outputGain,
      cleanupAt,
      stop: (when) => {
        stoppers.forEach((node) => {
          try {
            node.stop(when);
          } catch {
            // Ignore invalid stop races.
          }
        });
        scheduleCleanup(when);
      },
      dispose,
    };

    stoppers.forEach((node) => {
      node.stop(cleanupAt);
    });
    scheduleCleanup(cleanupAt);

    return voice;
  }
}
