import {
  StepSequencer as TransportSequencer,
  type ITriggeredStep,
  type ContextTime,
  type Ticks,
  type IStep,
  type IStepNote,
  type IStepCC,
  type IPage,
  type IPattern,
  type Resolution as TransportResolution,
  type PlaybackMode as TransportPlaybackMode,
  type SequencerState,
  divisionToMilliseconds,
  TPB,
  TransportState,
} from "@blibliki/transport";
import {
  Module,
  type IModule,
  type MidiOutput,
  Note,
  type ModulePropSchema,
  type EnumProp,
  type SetterHooks,
} from "@/core";
import MidiEvent from "@/core/midi/MidiEvent";
import type { ICreateModule, ModuleType } from ".";

// Re-export types from transport for compatibility
export type { IStep, IStepNote, IStepCC, IPage, IPattern };

export type IStepSequencer = IModule<ModuleType.StepSequencer>;

// Sequence entry for pattern sequencing
export type SequenceEntry = {
  pattern: string; // Pattern name (A, B, C, etc.)
  count: number; // Number of repetitions
};

// Convert transport types to engine enums for backwards compatibility
export enum Resolution {
  thirtysecond = "1/32",
  sixteenth = "1/16",
  eighth = "1/8",
  quarter = "1/4",
}

export enum PlaybackMode {
  loop = "loop",
  oneShot = "oneShot",
}

// Module props (serialized)
export type IStepSequencerProps = {
  patterns: IPattern[];
  activePatternNo: number; // Currently selected pattern index
  activePageNo: number; // Currently selected page within pattern
  stepsPerPage: number; // 1-16 steps per page
  resolution: Resolution; // Step resolution (16th, 8th, etc.)
  playbackMode: PlaybackMode; // loop or oneShot
  patternSequence: string; // Pattern sequence notation (e.g., "2A4B2AC")
  enableSequence: boolean; // Toggle to enable/disable sequence mode
};

// Module state (temporal/runtime only, not serialized)
export type IStepSequencerState = {
  isRunning: boolean;
  currentStep: number; // For UI indicator
  sequencePosition?: string; // UI display: "A (2/2)"
};

export const stepSequencerPropSchema: ModulePropSchema<
  Pick<
    IStepSequencerProps,
    | "activePatternNo"
    | "activePageNo"
    | "stepsPerPage"
    | "resolution"
    | "playbackMode"
    | "patternSequence"
    | "enableSequence"
  >,
  {
    resolution: EnumProp<Resolution>;
    playbackMode: EnumProp<PlaybackMode>;
  }
> = {
  activePatternNo: {
    kind: "number",
    label: "Active pattern",
    min: 0,
    max: 100,
    step: 1,
  },
  activePageNo: {
    kind: "number",
    label: "Active page",
    min: 0,
    max: 100,
    step: 1,
  },
  stepsPerPage: {
    kind: "number",
    min: 1,
    max: 16,
    step: 1,
    label: "Steps per Page",
  },
  resolution: {
    kind: "enum",
    options: Object.values(Resolution),
    label: "Resolution",
  },
  playbackMode: {
    kind: "enum",
    options: Object.values(PlaybackMode),
    label: "Playback Mode",
  },
  patternSequence: {
    kind: "string",
    label: "Pattern Sequence",
  },
  enableSequence: {
    kind: "boolean",
    label: "Enable Sequence",
  },
};

const NOTE_DIVISIONS: import("@blibliki/transport").Division[] = [
  "1/64",
  "1/48",
  "1/32",
  "1/24",
  "1/16",
  "1/12",
  "1/8",
  "1/6",
  "3/16",
  "1/4",
  "5/16",
  "1/3",
  "3/8",
  "1/2",
  "3/4",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "16",
  "32",
];

export const stepPropSchema: ModulePropSchema<
  Pick<IStep, "probability" | "duration" | "microtimeOffset">,
  {
    duration: EnumProp<import("@blibliki/transport").Division>;
  }
> = {
  probability: {
    kind: "number",
    label: "Probability",
    min: 0,
    max: 100,
    step: 1,
  },
  duration: {
    kind: "enum",
    label: "Duration",
    options: NOTE_DIVISIONS,
  },
  microtimeOffset: {
    kind: "number",
    label: "Microtiming",
    min: -100,
    max: 100,
    step: 1,
  },
};

// Create a default empty step
const createDefaultStep = (): IStep => ({
  active: false,
  notes: [],
  ccMessages: [],
  probability: 100,
  microtimeOffset: 0,
  duration: "1/16",
});

// Create a default page with 16 empty steps
const createDefaultPage = (name: string): IPage => ({
  name,
  steps: Array.from({ length: 16 }, () => createDefaultStep()),
});

// Create a default pattern with one page
const createDefaultPattern = (name: string): IPattern => ({
  name,
  pages: [createDefaultPage("Page 1")],
});

const DEFAULT_PROPS: IStepSequencerProps = {
  patterns: [createDefaultPattern("A")],
  activePatternNo: 0,
  activePageNo: 0,
  stepsPerPage: 16,
  resolution: Resolution.sixteenth,
  playbackMode: PlaybackMode.loop,
  patternSequence: "",
  enableSequence: false,
};

const DEFAULT_STATE: IStepSequencerState = {
  isRunning: false,
  currentStep: 0,
  sequencePosition: undefined,
};

type StepSequencerSetterHooks = Pick<
  SetterHooks<IStepSequencerProps>,
  "onSetActivePatternNo" | "onSetPatternSequence"
>;

export default class StepSequencer
  extends Module<ModuleType.StepSequencer>
  implements StepSequencerSetterHooks
{
  declare audioNode: undefined;
  midiOutput!: MidiOutput;

  private sequencer: TransportSequencer;
  private lastProcessedTick: Ticks = -1;
  private scheduledNotes = new Map<string, ContextTime>(); // Track scheduled note-offs
  private startContextTime: ContextTime = 0; // Reference time when sequencer started
  private startTicks: Ticks = 0; // Transport ticks when sequencer started

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.StepSequencer>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    // Initialize state
    this._state = { ...DEFAULT_STATE };

    // Create transport sequencer instance
    this.sequencer = new TransportSequencer({
      patterns: props.patterns,
      resolution: props.resolution as TransportResolution,
      stepsPerPage: props.stepsPerPage,
      playbackMode: props.playbackMode as TransportPlaybackMode,
      patternSequence: props.patternSequence,
      enableSequence: props.enableSequence,
      onStepTrigger: this.handleStepTrigger.bind(this),
      onStateChange: this.handleStateChange.bind(this),
      onComplete: this.handleComplete.bind(this),
    });

    this.registerOutputs();
    this.registerTransportListener();
  }

  onSetActivePatternNo: StepSequencerSetterHooks["onSetActivePatternNo"] = (
    value,
  ) => {
    return Math.max(Math.min(value, this.props.patterns.length - 1), 0);
  };

  onSetPatternSequence: StepSequencerSetterHooks["onSetPatternSequence"] = (
    value,
  ) => {
    this.sequencer.setPatternSequence(value);
    return value;
  };

  get activePattern(): IPattern {
    const pattern = this.props.patterns[this.props.activePatternNo];
    if (!pattern) throw Error("Pattern not found");

    return pattern;
  }

  get totalPages(): number {
    return this.activePattern.pages.length;
  }

  get activePage(): IPage {
    const page = this.activePattern.pages[this.props.activePageNo];
    if (!page) throw Error("Page not found");

    return page;
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi" });
  }

  private registerTransportListener() {
    this.engine.transport.addClockCallback(
      (
        _clockTime: import("@blibliki/transport").ClockTime,
        contextTime: ContextTime,
        ticks: Ticks,
      ) => {
        if (
          this.engine.state !== TransportState.playing ||
          !this.state.isRunning
        )
          return;

        this.processTransportTick(contextTime, ticks);
      },
    );
  }

  private processTransportTick(_contextTime: ContextTime, currentTicks: Ticks) {
    // Use lookahead window similar to Transport's scheduler
    // 200ms lookahead at 120 BPM = 0.2s * 120 BPM / 60 = 0.4 beats = 0.4 * TPB ticks
    const LOOKAHEAD_SECONDS = 0.2;
    const bpm = this.engine.bpm;
    const LOOKAHEAD_TICKS = Math.floor((LOOKAHEAD_SECONDS * bpm * TPB) / 60);

    const startTicks = this.lastProcessedTick + 1;
    const endTicks = currentTicks + LOOKAHEAD_TICKS;

    if (startTicks >= endTicks) return;

    // Call the transport sequencer's generator to get events
    const events = this.sequencer.generator(startTicks, endTicks);

    // Get the tempo's reference time for tick 0 to calculate absolute times
    const secondsPerTick = 60 / (bpm * TPB);

    // Process each event through the consumer
    events.forEach((event) => {
      // Calculate the absolute context time for this event based on its tick position
      // relative to when the sequencer started
      const ticksSinceSequencerStart = event.ticks - this.startTicks;
      const secondsSinceStart = ticksSinceSequencerStart * secondsPerTick;
      const eventContextTime = this.startContextTime + secondsSinceStart;

      // Create a new event with the calculated contextTime
      const eventWithTime = {
        ...event,
        contextTime: eventContextTime,
        time: 0, // Not used in consumer
      };

      this.sequencer.consumer(eventWithTime);
    });

    this.lastProcessedTick = endTicks - 1;
  }

  private handleStepTrigger(
    step: ITriggeredStep,
    timing: { contextTime: ContextTime; ticks: Ticks },
  ) {
    const bpm = this.engine.bpm;

    // Send CC messages immediately
    step.ccMessages.forEach((ccMessage) => {
      this.sendCC(ccMessage, timing.contextTime);
    });

    // Send notes with duration handling
    const noteDurationSeconds =
      divisionToMilliseconds(step.duration, bpm) / 1000;

    step.notes.forEach((stepNote) => {
      this.sendNoteOn(stepNote, timing.contextTime);
      if (noteDurationSeconds === Infinity) return;

      this.sendNoteOff(stepNote, timing.contextTime + noteDurationSeconds);
    });
  }

  private handleStateChange(state: SequencerState) {
    // Update module state for UI
    this.state = {
      ...this.state,
      isRunning: state.isRunning,
      currentStep: state.currentStep,
      sequencePosition: state.sequencePosition,
    };

    // Sync activePatternNo and activePageNo from sequencer state
    this.props = {
      ...this.props,
      activePatternNo: state.currentPattern,
      activePageNo: state.currentPage,
    };

    this.triggerPropsUpdate();
  }

  private handleComplete() {
    // Pattern completed in oneShot mode or loop completed
  }

  private sendNoteOn(stepNote: IStepNote, triggeredAt: ContextTime) {
    const note = new Note(stepNote.note);
    note.velocity = stepNote.velocity / 127; // Normalize to 0-1

    const midiEvent = MidiEvent.fromNote(note, true, triggeredAt);
    this.midiOutput.onMidiEvent(midiEvent);

    // Track scheduled note
    this.scheduledNotes.set(stepNote.note, triggeredAt);
  }

  private sendNoteOff(stepNote: IStepNote, triggeredAt: ContextTime) {
    const midiEvent = MidiEvent.fromNote(stepNote.note, false, triggeredAt);
    this.midiOutput.onMidiEvent(midiEvent);

    // Remove from scheduled notes
    this.scheduledNotes.delete(stepNote.note);
  }

  private sendCC(stepCC: IStepCC, triggeredAt: ContextTime) {
    const midiEvent = MidiEvent.fromCC(stepCC.cc, stepCC.value, triggeredAt);
    this.midiOutput.onMidiEvent(midiEvent);
  }

  // Called when transport starts
  start(time: ContextTime): void {
    super.start(time);

    this.state = { isRunning: true };
    // Initialize to -1 so the first generator call starts from tick 0
    this.lastProcessedTick = -1;
    this.scheduledNotes.clear();

    // Save reference time and ticks when sequencer starts
    this.startContextTime = time;
    this.startTicks = this.engine.transport.position.ticks;

    this.sequencer.start(time);

    // Process initial events immediately to avoid delay from clock callback
    const currentTicks = this.engine.transport.position.ticks;
    this.processTransportTick(time, currentTicks);

    this.triggerPropsUpdate();
  }

  // Called when transport stops
  stop(time: ContextTime): void {
    super.stop(time);

    this.state = { isRunning: false };

    // Send all note-offs immediately
    this.scheduledNotes.forEach((_offTime, noteName) => {
      const midiEvent = MidiEvent.fromNote(noteName, false, time);
      this.midiOutput.onMidiEvent(midiEvent);
    });

    this.scheduledNotes.clear();
    this.sequencer.stop(time);

    // Reset UI indicator
    this.state = { currentStep: 0 };
    this.triggerPropsUpdate();
  }

  // Delegate update methods to transport sequencer
  updateStep(
    patternIndex: number,
    pageIndex: number,
    stepIndex: number,
    changes: Partial<IStep>,
  ): void {
    this.sequencer.updateStep(patternIndex, pageIndex, stepIndex, changes);
  }

  setResolution(resolution: Resolution): void {
    this.sequencer.setResolution(resolution as TransportResolution);
    this.props = { ...this.props, resolution };
  }

  setPlaybackMode(mode: PlaybackMode): void {
    this.sequencer.setPlaybackMode(mode as TransportPlaybackMode);
    this.props = { ...this.props, playbackMode: mode };
  }

  setStepsPerPage(count: number): void {
    this.sequencer.setStepsPerPage(count);
    this.props = { ...this.props, stepsPerPage: count };
  }

  setPatternSequence(sequence: string): void {
    this.sequencer.setPatternSequence(sequence);
    this.props = { ...this.props, patternSequence: sequence };
  }

  setEnableSequence(enabled: boolean): void {
    this.sequencer.setEnableSequence(enabled);
    this.props = { ...this.props, enableSequence: enabled };
  }

  addPattern(pattern: IPattern): void {
    this.sequencer.addPattern(pattern);
    this.props = {
      ...this.props,
      patterns: [...this.props.patterns, pattern],
    };
  }

  removePattern(index: number): void {
    this.sequencer.removePattern(index);
    const newPatterns = [...this.props.patterns];
    newPatterns.splice(index, 1);
    this.props = { ...this.props, patterns: newPatterns };
  }

  addPage(patternIndex: number, page: IPage): void {
    this.sequencer.addPage(patternIndex, page);
    const newPatterns = [...this.props.patterns];
    const pattern = newPatterns[patternIndex];
    if (!pattern) throw new Error(`Pattern ${patternIndex} not found`);

    newPatterns[patternIndex] = {
      ...pattern,
      pages: [...pattern.pages, page],
    };
    this.props = { ...this.props, patterns: newPatterns };
  }

  removePage(patternIndex: number, pageIndex: number): void {
    this.sequencer.removePage(patternIndex, pageIndex);
    const newPatterns = [...this.props.patterns];
    const pattern = newPatterns[patternIndex];
    if (!pattern) throw new Error(`Pattern ${patternIndex} not found`);

    const newPages = [...pattern.pages];
    newPages.splice(pageIndex, 1);
    newPatterns[patternIndex] = {
      ...pattern,
      pages: newPages,
    };
    this.props = { ...this.props, patterns: newPatterns };
  }

  getStep(patternIndex: number, pageIndex: number, stepIndex: number): IStep {
    return this.sequencer.getStep(patternIndex, pageIndex, stepIndex);
  }

  getPattern(index: number): IPattern {
    return this.sequencer.getPattern(index);
  }

  getPage(patternIndex: number, pageIndex: number): IPage {
    return this.sequencer.getPage(patternIndex, pageIndex);
  }
}
