import {
  ClockTime,
  ContextTime,
  Division,
  divisionToMilliseconds,
  Ticks,
  TPB,
  TransportState,
} from "@blibliki/transport";
import {
  Module,
  IModule,
  MidiOutput,
  Note,
  ModulePropSchema,
  EnumProp,
  SetterHooks,
} from "@/core";
import MidiEvent from "@/core/midi/MidiEvent";
import { ICreateModule, ModuleType } from ".";

export type IStepSequencer = IModule<ModuleType.StepSequencer>;

// Per-note data within a step
export type IStepNote = {
  note: string; // "C4", "E4", "G4"
  velocity: number; // 0-127
};

// Per-CC data within a step
export type IStepCC = {
  cc: number; // 0-127 MIDI CC number
  value: number; // 0-127 CC value
};

// Individual step
export type IStep = {
  active: boolean; // Whether step is enabled/muted
  notes: IStepNote[]; // Multiple notes for chords
  ccMessages: IStepCC[]; // Multiple CC messages per step
  probability: number; // 0-100% chance to trigger
  microtimeOffset: number; // -50 to +50 ticks offset
  duration: Division;
};

// Page contains multiple steps
export type IPage = {
  name: string;
  steps: IStep[];
};

// Pattern contains multiple pages
export type IPattern = {
  name: string;
  pages: IPage[];
};

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
  _currentStep?: number; // For UI indicator (not serialized in schema)
};

const MICROTIMING_STEP = TPB / 4 / 10;

export const stepSequencerPropSchema: ModulePropSchema<
  Pick<
    IStepSequencerProps,
    | "activePatternNo"
    | "activePageNo"
    | "stepsPerPage"
    | "resolution"
    | "playbackMode"
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
};

const NOTE_DIVISIONS: Division[] = [
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
    duration: EnumProp<Division>;
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
  _currentStep: 0,
};

// Timing constants
const RESOLUTION_TO_TICKS: Record<Resolution, number> = {
  [Resolution.thirtysecond]: TPB / 8, // 1920 ticks
  [Resolution.sixteenth]: TPB / 4, // 3840 ticks
  [Resolution.eighth]: TPB / 2, // 7680 ticks
  [Resolution.quarter]: TPB, // 15360 ticks
};

type StepSequencerSetterHooks = Pick<
  SetterHooks<IStepSequencerProps>,
  "onSetActivePatternNo"
>;

export default class StepSequencer
  extends Module<ModuleType.StepSequencer>
  implements StepSequencerSetterHooks
{
  declare audioNode: undefined;
  midiOutput!: MidiOutput;

  private previousStepNo = -1;
  private scheduledNotes = new Map<string, ContextTime>(); // Track scheduled note-offs
  private isSequencerRunning = false;
  private startTick: Ticks = 0;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.StepSequencer>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.registerOutputs();
    this.registerTransportListener();
  }

  onSetActivePatternNo: StepSequencerSetterHooks["onSetActivePatternNo"] = (
    value,
  ) => {
    return Math.max(Math.min(value, this.props.patterns.length - 1), 0);
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

  get calculatedPageNo() {
    return Math.floor(this.globalStepNo / this.props.stepsPerPage);
  }

  get totalSteps() {
    return this.totalPages * this.props.stepsPerPage;
  }

  get stepTicks(): Ticks {
    return RESOLUTION_TO_TICKS[this.props.resolution];
  }

  get globalStepNo() {
    const currentTick = this.engine.transport.position.ticks;
    const relativeTick = currentTick - this.startTick;
    return Math.floor(relativeTick / this.stepTicks) % this.totalSteps;
  }

  get activeStepNo() {
    return this.globalStepNo % this.props.stepsPerPage;
  }

  get activeStep(): IStep {
    const step = this.activePage.steps[this.activeStepNo];
    if (!step) throw Error("Step not found");

    return step;
  }

  get nextGlobalStepNo() {
    return (this.globalStepNo + 1) % this.totalSteps;
  }

  get nextStepPageNo() {
    return Math.floor(this.nextGlobalStepNo / this.props.stepsPerPage);
  }

  get nextStepNo() {
    return this.nextGlobalStepNo % this.props.stepsPerPage;
  }

  get nextStepPage(): IPage {
    const page = this.activePattern.pages[this.nextStepPageNo];
    if (!page) throw Error("Next step page not found");

    return page;
  }

  get nextStep(): IStep {
    const step = this.nextStepPage.steps[this.nextStepNo];
    if (!step) throw Error("Next step not found");

    return step;
  }

  // Public methods to control sequencer independently
  startSequencer() {
    if (this.isSequencerRunning) return;
    this.isSequencerRunning = true;
    this.startTick = this.engine.transport.position.ticks;
    this.previousStepNo = -1;
    this.scheduledNotes.clear();
  }

  stopSequencer(time: ContextTime) {
    if (!this.isSequencerRunning) return;
    this.isSequencerRunning = false;

    // Send all note-offs immediately
    this.scheduledNotes.forEach((_offTime, noteName) => {
      const midiEvent = MidiEvent.fromNote(noteName, false, time);
      this.midiOutput.onMidiEvent(midiEvent);
    });

    this.scheduledNotes.clear();
    this.previousStepNo = -1;

    // Reset UI indicator
    this.props = { ...this.props, _currentStep: 0 };
    this.triggerPropsUpdate();
  }

  get isRunning(): boolean {
    return this.isSequencerRunning;
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi" });
  }

  private registerTransportListener() {
    this.engine.transport.addClockCallback(
      (_: ClockTime, contextTime: ContextTime) => {
        if (
          this.engine.state !== TransportState.playing ||
          !this.isSequencerRunning
        )
          return;

        this.checkStepBoundary(contextTime);
      },
    );
  }

  private checkStepBoundary(contextTime: ContextTime) {
    const calculatedPageNo = this.calculatedPageNo;
    const activeStepNo = this.activeStepNo;
    const activeStep = this.activeStep;
    const nextStep = this.nextStep;

    // Detect step boundary (when step number changes)
    if (activeStepNo === this.previousStepNo) return;

    if (
      this.globalStepNo === 0 &&
      this.previousStepNo !== -1 &&
      this.props.playbackMode === PlaybackMode.oneShot
    ) {
      this.stop(contextTime); // TODO just StepSequencer stop
      return;
    }

    this.props = {
      ...this.props,
      activePageNo: calculatedPageNo,
      _currentStep: activeStepNo,
    };

    if (activeStep.microtimeOffset >= 0) {
      this.triggerStep(activeStep, contextTime);
    }

    if (nextStep.microtimeOffset < 0) {
      const bpm = this.engine.bpm;
      const stepDurationSeconds = (this.stepTicks / TPB) * (60 / bpm);
      this.triggerStep(nextStep, contextTime + stepDurationSeconds);
    }

    this.previousStepNo = activeStepNo;

    // Update UI indicator
    this.triggerPropsUpdate();
  }

  private triggerStep(step: IStep, contextTime: ContextTime) {
    if (!step.active) return;

    // Check if step has notes or CC messages
    if (step.notes.length === 0 && step.ccMessages.length === 0) return;

    // Check probability
    if (Math.random() * 100 > step.probability) return;

    const bpm = this.engine.bpm;

    // Send CC messages immediately
    step.ccMessages.forEach((ccMessage) => {
      this.sendCC(ccMessage, contextTime);
    });

    // Send notes
    const microtimeOffsetSeconds =
      (step.microtimeOffset / MICROTIMING_STEP) * (60 / bpm);
    const noteDurationSeconds =
      divisionToMilliseconds(step.duration, bpm) / 1000;

    const noteTime = contextTime + microtimeOffsetSeconds;

    step.notes.forEach((stepNote) => {
      this.sendNoteOn(stepNote, noteTime);
      if (noteDurationSeconds === Infinity) return;

      this.sendNoteOff(stepNote, noteTime + noteDurationSeconds);
    });
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
    this.isSequencerRunning = true;
    this.startTick = this.engine.transport.position.ticks;
    this.previousStepNo = -1;
    this.scheduledNotes.clear();
  }

  // Called when transport stops
  stop(time: ContextTime): void {
    super.stop(time);

    this.isSequencerRunning = false;

    // Send all note-offs immediately
    this.scheduledNotes.forEach((_offTime, noteName) => {
      const midiEvent = MidiEvent.fromNote(noteName, false, time);
      this.midiOutput.onMidiEvent(midiEvent);
    });

    this.scheduledNotes.clear();
    this.previousStepNo = -1;

    // Reset UI indicator
    this.props = { ...this.props, _currentStep: 0 };
    this.triggerPropsUpdate();
  }
}
