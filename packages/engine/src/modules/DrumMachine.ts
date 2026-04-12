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

type NoiseVoice = "cymbal" | "clap" | "openHat" | "closedHat";

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
const IDLE_GAIN = 0;
const ATTACK_TIME = 0.002;
const CLEANUP_TAIL = 0.1;
const ENVELOPE_IDLE_DELAY = 0.001;

const VOICE_POOL_SIZES: Record<DrumVoice, number> = {
  kick: 2,
  snare: 2,
  tom: 2,
  cymbal: 2,
  cowbell: 2,
  clap: 2,
  openHat: 2,
  closedHat: 2,
};

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
  activeUntil: number;
  nodes: AudioNode[];
  stoppers: OscillatorNode[];
};

type KickSlot = DisposableVoice & {
  oscillator: OscillatorNode;
};

type SnareSlot = DisposableVoice & {
  filter: BiquadFilterNode;
  oscillator: OscillatorNode;
  bodyGain: GainNode;
};

type TomSlot = DisposableVoice & {
  oscillator: OscillatorNode;
};

type CowbellSlot = DisposableVoice & {
  filter: BiquadFilterNode;
  oscillatorA: OscillatorNode;
  oscillatorB: OscillatorNode;
};

type NoiseSlot = DisposableVoice & {
  filter: BiquadFilterNode;
};

type DrumVoiceSlots = {
  kick: KickSlot[];
  snare: SnareSlot[];
  tom: TomSlot[];
  cymbal: NoiseSlot[];
  cowbell: CowbellSlot[];
  clap: NoiseSlot[];
  openHat: NoiseSlot[];
  closedHat: NoiseSlot[];
};

export default class DrumMachine
  extends Module<ModuleType.DrumMachine>
  implements Pick<SetterHooks<IDrumMachineProps>, "onAfterSetMasterLevel">
{
  declare audioNode: undefined;
  private readonly masterBus: GainNode;
  private readonly voiceBuses: Record<DrumVoice, GainNode>;
  private readonly sharedNoiseSource: AudioBufferSourceNode;
  private readonly voiceSlots: DrumVoiceSlots;
  private noiseBuffer?: AudioBuffer;
  private activeOpenHats = new Set<NoiseSlot>();

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
    this.sharedNoiseSource = this.createSharedNoiseSource();
    this.voiceSlots = this.createVoiceSlots();

    Object.values(this.voiceBuses).forEach((voiceBus) => {
      voiceBus.connect(this.masterBus);
    });

    this.sharedNoiseSource.start();

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

    this.playVoice(voice, note.velocity, triggeredAt);
  }

  dispose() {
    this.activeOpenHats.clear();

    this.disposeVoiceSlots();
    try {
      this.sharedNoiseSource.stop();
    } catch {
      // Shared noise source may already be stopped during teardown races.
    }
    this.sharedNoiseSource.disconnect();

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
    const slot = this.acquireVoiceSlot("kick", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "kick",
      velocity,
    );

    slot.oscillator.frequency.cancelScheduledValues(triggeredAt);
    slot.oscillator.frequency.setValueAtTime(180 + tone * 60, triggeredAt);
    slot.oscillator.frequency.exponentialRampToValueAtTime(
      45 + tone * 10,
      triggeredAt + Math.max(0.03, decay * 0.2),
    );

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.12, decay * 0.6),
    );
  }

  private triggerSnare(velocity: number, triggeredAt: ContextTime) {
    const slot = this.acquireVoiceSlot("snare", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "snare",
      velocity,
    );

    slot.filter.frequency.cancelScheduledValues(triggeredAt);
    slot.filter.frequency.setValueAtTime(1200 + tone * 5000, triggeredAt);

    slot.oscillator.frequency.cancelScheduledValues(triggeredAt);
    slot.oscillator.frequency.setValueAtTime(220 + tone * 100, triggeredAt);
    slot.oscillator.frequency.exponentialRampToValueAtTime(
      120 + tone * 40,
      triggeredAt + Math.max(0.02, decay * 0.12),
    );
    slot.bodyGain.gain.cancelScheduledValues(triggeredAt);
    slot.bodyGain.gain.setValueAtTime(peak * 0.4, triggeredAt);

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.08, decay * 0.55),
    );
  }

  private triggerTom(velocity: number, triggeredAt: ContextTime) {
    const slot = this.acquireVoiceSlot("tom", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "tom",
      velocity,
    );

    slot.oscillator.frequency.cancelScheduledValues(triggeredAt);
    slot.oscillator.frequency.setValueAtTime(170 + tone * 120, triggeredAt);
    slot.oscillator.frequency.exponentialRampToValueAtTime(
      90 + tone * 40,
      triggeredAt + Math.max(0.04, decay * 0.2),
    );

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.12, decay * 0.7),
    );
  }

  private triggerCowbell(velocity: number, triggeredAt: ContextTime) {
    const slot = this.acquireVoiceSlot("cowbell", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "cowbell",
      velocity,
    );

    slot.filter.frequency.cancelScheduledValues(triggeredAt);
    slot.filter.frequency.setValueAtTime(1200 + tone * 1800, triggeredAt);
    slot.oscillatorA.frequency.cancelScheduledValues(triggeredAt);
    slot.oscillatorA.frequency.setValueAtTime(540 + tone * 80, triggeredAt);
    slot.oscillatorB.frequency.cancelScheduledValues(triggeredAt);
    slot.oscillatorB.frequency.setValueAtTime(845 + tone * 120, triggeredAt);

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.08, decay * 0.45),
    );
  }

  private triggerClap(velocity: number, triggeredAt: ContextTime) {
    const slot = this.acquireVoiceSlot("clap", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "clap",
      velocity,
    );

    slot.filter.frequency.cancelScheduledValues(triggeredAt);
    slot.filter.frequency.setValueAtTime(1500 + tone * 4200, triggeredAt);

    slot.activeUntil = this.scheduleClapEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.12, decay * 0.55),
    );
  }

  private triggerCymbal(velocity: number, triggeredAt: ContextTime) {
    const slot = this.acquireVoiceSlot("cymbal", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "cymbal",
      velocity,
    );

    slot.filter.frequency.cancelScheduledValues(triggeredAt);
    slot.filter.frequency.setValueAtTime(3200 + tone * 5200, triggeredAt);

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.25, decay * 0.9),
    );
  }

  private triggerOpenHat(velocity: number, triggeredAt: ContextTime) {
    this.pruneActiveOpenHats(triggeredAt);

    const slot = this.acquireVoiceSlot("openHat", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "openHat",
      velocity,
    );

    slot.filter.frequency.cancelScheduledValues(triggeredAt);
    slot.filter.frequency.setValueAtTime(4200 + tone * 5000, triggeredAt);

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.2, decay * 0.8),
    );
    this.activeOpenHats.add(slot);
  }

  private triggerClosedHat(velocity: number, triggeredAt: ContextTime) {
    const slot = this.acquireVoiceSlot("closedHat", triggeredAt);
    const { peak, decay, tone } = this.getTriggeredVoiceSettings(
      "closedHat",
      velocity,
    );

    slot.filter.frequency.cancelScheduledValues(triggeredAt);
    slot.filter.frequency.setValueAtTime(5000 + tone * 5500, triggeredAt);

    slot.activeUntil = this.scheduleDecayEnvelope(
      slot.outputGain,
      peak,
      triggeredAt,
      Math.max(0.05, decay * 0.3),
    );
  }

  private chokeOpenHats(triggeredAt: ContextTime) {
    this.pruneActiveOpenHats(triggeredAt);

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
      voice.outputGain.gain.setValueAtTime(
        IDLE_GAIN,
        releaseAt + ENVELOPE_IDLE_DELAY,
      );
      voice.activeUntil = releaseAt + CLEANUP_TAIL;
    });
  }

  private getTriggeredVoiceSettings(voice: DrumVoice, velocity: number) {
    const { level, decay, tone } = this.getVoiceSettings(voice);

    return {
      peak: Math.max(
        MIN_ENVELOPE_GAIN,
        level * this.normalizeVelocity(velocity),
      ),
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

  private acquireVoiceSlot(voice: "kick", triggeredAt: ContextTime): KickSlot;
  private acquireVoiceSlot(voice: "snare", triggeredAt: ContextTime): SnareSlot;
  private acquireVoiceSlot(voice: "tom", triggeredAt: ContextTime): TomSlot;
  private acquireVoiceSlot(
    voice: NoiseVoice,
    triggeredAt: ContextTime,
  ): NoiseSlot;
  private acquireVoiceSlot(
    voice: "cowbell",
    triggeredAt: ContextTime,
  ): CowbellSlot;
  private acquireVoiceSlot(voice: DrumVoice, triggeredAt: ContextTime) {
    const slots = this.voiceSlots[voice] as DisposableVoice[];
    const slot =
      slots.find((candidate) => candidate.activeUntil <= triggeredAt) ??
      slots.reduce((oldest, candidate) =>
        candidate.activeUntil < oldest.activeUntil ? candidate : oldest,
      );

    if (voice === "openHat") {
      this.activeOpenHats.delete(slot as unknown as NoiseSlot);
    }

    this.resetVoiceSlot(slot, triggeredAt);

    return slot;
  }

  private resetVoiceSlot(slot: DisposableVoice, triggeredAt: ContextTime) {
    slot.outputGain.gain.cancelScheduledValues(triggeredAt);
    slot.outputGain.gain.setValueAtTime(IDLE_GAIN, triggeredAt);
    slot.activeUntil = triggeredAt;
  }

  private pruneActiveOpenHats(triggeredAt: ContextTime) {
    this.activeOpenHats.forEach((slot) => {
      if (slot.activeUntil <= triggeredAt) {
        this.activeOpenHats.delete(slot);
      }
    });
  }

  private scheduleDecayEnvelope(
    outputGain: GainNode,
    peak: number,
    triggeredAt: ContextTime,
    decay: number,
  ) {
    const releaseAt = triggeredAt + decay;

    outputGain.gain.cancelScheduledValues(triggeredAt);
    outputGain.gain.setValueAtTime(IDLE_GAIN, triggeredAt);
    outputGain.gain.setValueAtTime(MIN_ENVELOPE_GAIN, triggeredAt);
    outputGain.gain.exponentialRampToValueAtTime(
      peak,
      triggeredAt + ATTACK_TIME,
    );
    outputGain.gain.exponentialRampToValueAtTime(MIN_ENVELOPE_GAIN, releaseAt);
    outputGain.gain.setValueAtTime(IDLE_GAIN, releaseAt + ENVELOPE_IDLE_DELAY);

    return releaseAt + CLEANUP_TAIL;
  }

  private scheduleClapEnvelope(
    outputGain: GainNode,
    peak: number,
    triggeredAt: ContextTime,
    decay: number,
  ) {
    const gain = outputGain.gain;
    const burstInterval = 0.018;
    const tailStart = triggeredAt + burstInterval * 3;
    const releaseAt = tailStart + decay;

    gain.cancelScheduledValues(triggeredAt);
    gain.setValueAtTime(IDLE_GAIN, triggeredAt);

    [1, 0.75, 0.55].forEach((multiplier, index) => {
      const burstStart = triggeredAt + index * burstInterval;
      gain.setValueAtTime(IDLE_GAIN, burstStart);
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

    gain.setValueAtTime(peak * 0.45, tailStart);
    gain.exponentialRampToValueAtTime(MIN_ENVELOPE_GAIN, releaseAt);
    gain.setValueAtTime(IDLE_GAIN, releaseAt + ENVELOPE_IDLE_DELAY);

    return releaseAt + CLEANUP_TAIL;
  }

  private createSharedNoiseSource() {
    const noiseSource = new AudioBufferSourceNode(this.context.audioContext, {
      loop: true,
    });
    noiseSource.buffer = this.getNoiseBuffer();
    noiseSource.loop = true;
    return noiseSource;
  }

  private createVoiceSlots(): DrumVoiceSlots {
    return {
      kick: Array.from({ length: VOICE_POOL_SIZES.kick }, () =>
        this.createKickSlot(),
      ),
      snare: Array.from({ length: VOICE_POOL_SIZES.snare }, () =>
        this.createSnareSlot(),
      ),
      tom: Array.from({ length: VOICE_POOL_SIZES.tom }, () =>
        this.createTomSlot(),
      ),
      cymbal: Array.from({ length: VOICE_POOL_SIZES.cymbal }, () =>
        this.createNoiseSlot("cymbal", "highpass", 0.7),
      ),
      cowbell: Array.from({ length: VOICE_POOL_SIZES.cowbell }, () =>
        this.createCowbellSlot(),
      ),
      clap: Array.from({ length: VOICE_POOL_SIZES.clap }, () =>
        this.createNoiseSlot("clap", "bandpass", 0.8),
      ),
      openHat: Array.from({ length: VOICE_POOL_SIZES.openHat }, () =>
        this.createNoiseSlot("openHat", "highpass", 0.8),
      ),
      closedHat: Array.from({ length: VOICE_POOL_SIZES.closedHat }, () =>
        this.createNoiseSlot("closedHat", "highpass", 1),
      ),
    };
  }

  private createKickSlot(): KickSlot {
    const outputGain = this.createSlotOutput("kick");
    const oscillator = new OscillatorNode(this.context.audioContext, {
      type: "sine",
      frequency: 140,
    });

    oscillator.connect(outputGain);
    oscillator.start();

    return {
      outputGain,
      oscillator,
      activeUntil: 0,
      nodes: [oscillator, outputGain],
      stoppers: [oscillator],
    };
  }

  private createSnareSlot(): SnareSlot {
    const outputGain = this.createSlotOutput("snare");
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "highpass",
      frequency: 1200,
      Q: 0.7,
    });
    const oscillator = new OscillatorNode(this.context.audioContext, {
      type: "triangle",
      frequency: 180,
    });
    const bodyGain = new GainNode(this.context.audioContext, {
      gain: 0,
    });

    this.sharedNoiseSource.connect(filter);
    filter.connect(outputGain);
    oscillator.connect(bodyGain);
    bodyGain.connect(outputGain);
    oscillator.start();

    return {
      outputGain,
      filter,
      oscillator,
      bodyGain,
      activeUntil: 0,
      nodes: [filter, oscillator, bodyGain, outputGain],
      stoppers: [oscillator],
    };
  }

  private createTomSlot(): TomSlot {
    const outputGain = this.createSlotOutput("tom");
    const oscillator = new OscillatorNode(this.context.audioContext, {
      type: "sine",
      frequency: 110,
    });

    oscillator.connect(outputGain);
    oscillator.start();

    return {
      outputGain,
      oscillator,
      activeUntil: 0,
      nodes: [oscillator, outputGain],
      stoppers: [oscillator],
    };
  }

  private createCowbellSlot(): CowbellSlot {
    const outputGain = this.createSlotOutput("cowbell");
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type: "bandpass",
      frequency: 1200,
      Q: 1.4,
    });
    const oscillatorA = new OscillatorNode(this.context.audioContext, {
      type: "square",
      frequency: 540,
    });
    const oscillatorB = new OscillatorNode(this.context.audioContext, {
      type: "square",
      frequency: 845,
    });

    oscillatorA.connect(filter);
    oscillatorB.connect(filter);
    filter.connect(outputGain);
    oscillatorA.start();
    oscillatorB.start();

    return {
      outputGain,
      filter,
      oscillatorA,
      oscillatorB,
      activeUntil: 0,
      nodes: [filter, oscillatorA, oscillatorB, outputGain],
      stoppers: [oscillatorA, oscillatorB],
    };
  }

  private createNoiseSlot(
    voice: DrumVoice,
    type: BiquadFilterType,
    q: number,
  ): NoiseSlot {
    const outputGain = this.createSlotOutput(voice);
    const filter = new BiquadFilterNode(this.context.audioContext, {
      type,
      frequency: 1200,
      Q: q,
    });

    this.sharedNoiseSource.connect(filter);
    filter.connect(outputGain);

    return {
      outputGain,
      filter,
      activeUntil: 0,
      nodes: [filter, outputGain],
      stoppers: [],
    };
  }

  private createSlotOutput(voice: DrumVoice) {
    const outputGain = new GainNode(this.context.audioContext, {
      gain: IDLE_GAIN,
    });

    outputGain.connect(this.voiceBuses[voice]);
    return outputGain;
  }

  private getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;

    const durationSeconds = 4;
    const sampleRate = this.context.audioContext.sampleRate;
    const length = sampleRate * durationSeconds;
    const buffer = this.context.audioContext.createBuffer(
      1,
      length,
      sampleRate,
    );
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  private disposeVoiceSlots() {
    DRUM_VOICES.forEach((voice) => {
      this.voiceSlots[voice].forEach((slot) => {
        slot.stoppers.forEach((node) => {
          try {
            node.stop();
          } catch {
            // Nodes may already be stopped during teardown races.
          }
        });

        slot.nodes.forEach((node) => {
          try {
            node.disconnect();
          } catch {
            // Ignore disconnect errors during cleanup.
          }
        });
      });
    });
  }
}
