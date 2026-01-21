import {
  ContextTime,
  Division,
  divisionToMilliseconds,
  TPB,
  StepSequencerSource,
  StepSequencerSourceEvent,
  Resolution,
  PlaybackMode,
  IStep,
  IStepNote,
  IStepCC,
  IPage,
  IPattern,
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

// Re-export types from transport for backward compatibility
export type { IStep, IStepNote, IStepCC, IPage, IPattern };
export { Resolution, PlaybackMode };

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

const MICROTIMING_STEP = TPB / 4 / 10;

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

  private scheduledNotes = new Map<string, ContextTime>(); // Track scheduled note-offs
  private source?: StepSequencerSource;

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

    this.registerOutputs();
    this.initializeSource();
  }

  onSetActivePatternNo: StepSequencerSetterHooks["onSetActivePatternNo"] = (
    value,
  ) => {
    return Math.max(Math.min(value, this.props.patterns.length - 1), 0);
  };

  onSetPatternSequence: StepSequencerSetterHooks["onSetPatternSequence"] = (
    value,
  ) => {
    if (this.source) {
      this.source.props = {
        ...this.source.props,
        patternSequence: value,
      };
    }

    return value;
  };

  private initializeSource() {
    this.source = new StepSequencerSource(this.engine.transport, {
      onEvent: this.handleStepEvent,
      patterns: this.props.patterns,
      stepsPerPage: this.props.stepsPerPage,
      resolution: this.props.resolution,
      playbackMode: this.props.playbackMode,
      patternSequence: this.props.patternSequence,
      enableSequence: this.props.enableSequence,
    });

    this.engine.transport.addSource(this.source);
  }

  private handleStepEvent = (event: StepSequencerSourceEvent) => {
    // Update state for UI
    this.state = {
      ...this.state,
      currentStep: event.stepNo,
    };

    // Update active page if changed
    if (event.pageNo !== this.props.activePageNo) {
      this.props = {
        ...this.props,
        activePageNo: event.pageNo,
      };
    }

    // Update active pattern if changed (for sequence mode)
    if (event.patternNo !== this.props.activePatternNo) {
      this.props = {
        ...this.props,
        activePatternNo: event.patternNo,
      };
    }

    // Trigger the step
    this.triggerStep(event.step, event.contextTime);

    // Trigger UI update
    this.triggerPropsUpdate();
  };

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi" });
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

    this.state = { isRunning: true };
    this.scheduledNotes.clear();

    // Start the source
    const ticks = this.engine.transport.position.ticks;
    this.source!.onStart(ticks);

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

    // Stop the source
    const ticks = this.engine.transport.position.ticks;
    this.source!.onStop(ticks);

    // Reset UI indicator
    this.state = { currentStep: 0 };
    this.triggerPropsUpdate();
  }

  dispose() {
    if (!this.source) return;

    this.engine.transport.removeSource(this.source.id);
  }
}
