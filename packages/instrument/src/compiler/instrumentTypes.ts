import type {
  BPM,
  IEngineSerialize,
  IStep,
  MidiInputSchema,
  TimeSignature,
} from "@blibliki/engine";
import type {
  EffectProfileId,
  InstrumentGlobalBlock,
  InstrumentNoteSource,
  InstrumentTrackAudioSource,
  SourceProfileId,
} from "@/document/types";
import type { MacroControllerScope } from "@/macros/types";
import type { TrackPageKey } from "@/types";
import type { CompiledMidiMapperProps } from "./types";
import type { MidiPortSelection } from "./types";
import type { CompiledTrack } from "./types";

export type CompiledInstrumentTrack = {
  key: string;
  name: string;
  midiChannel: number;
  noteSource: InstrumentNoteSource;
  audioSource: InstrumentTrackAudioSource;
  sourceProfileId: SourceProfileId;
  // What the track's source accepts, read from its "midi in".
  noteSchema: MidiInputSchema;
  fxChain: [EffectProfileId, EffectProfileId, EffectProfileId, EffectProfileId];
  compiledTrack: CompiledTrack;
};

export type CompileInstrumentOptions = {
  trackVoices?: number;
};

export type CompiledInstrumentLaunchControlXL3PageSummary = {
  trackKey: string;
  trackName: string;
  midiChannel: number;
  controllerPage: 1 | 2 | 3;
  trackIndex: number;
  pageKey: TrackPageKey;
};

export type InstrumentRuntimeMode = "performance" | "seqEdit";

// A step button that is down. `edited` flips once an encoder moves or a note
// is played, so the release knows whether it was a tap (toggle) or a hold
// (edit). `played` flips on the first note: that one replaces the step's
// notes, later ones join the chord.
export type HeldStep = {
  stepIndex: number;
  pressedAt: number;
  edited: boolean;
  played?: boolean;
};

// A key that is down on the active track's channel.
export type HeldNote = {
  note: string;
  velocity: number;
};

// Step record is armed: `cursor` is the step on the current bar the next
// note writes to, and `written` says a chord is there since the cursor last
// moved, so releasing every key advances.
export type StepRecordState = {
  cursor: number;
  written: boolean;
};

export type StepDefaults = {
  note: string;
  velocity: number;
  duration: IStep["duration"];
  probability: number;
};

export type InstrumentNavigationState = {
  activeTrackIndex: number;
  activePage: TrackPageKey;
  mode: InstrumentRuntimeMode;
  shiftPressed: boolean;
  sequencerPageIndex: number;
  heldSteps: HeldStep[];
  stepDefaults: Record<string, Partial<StepDefaults>>;
  // Keys down on the active track's channel, in press order; a step tapped
  // while they are down gets them as its chord.
  heldNotes?: HeldNote[];
  stepRecord?: StepRecordState;
  // Real-time record is armed. `erasing` while the clear gesture is held:
  // the playhead then erases the steps it passes.
  liveRecord?: { erasing: boolean };
  // The step tapped first while Shift is held; later taps paste it.
  copySource?: number;
  // A euclidean fill being previewed while Shift is held; written on release.
  fill?: FillPattern;
};

export type FillPattern = {
  pulses: number;
  rotate: number;
};

export type CompiledInstrument = {
  version: string;
  name: string;
  templateId: string;
  hardwareProfileId: string;
  globalBlock: InstrumentGlobalBlock;
  globalController: MacroControllerScope;
  tracks: CompiledInstrumentTrack[];
  launchControlXL3: {
    pages: CompiledInstrumentLaunchControlXL3PageSummary[];
  };
};

export type CompiledInstrumentMidiMapperProps = Pick<
  CompiledMidiMapperProps,
  "tracks" | "activeTrack" | "globalMappings"
>;

export type CreateInstrumentEnginePatchOptions = {
  bpm?: BPM;
  timeSignature?: TimeSignature;
  trackVoices?: number;
  noteInput?: MidiPortSelection | false;
  controllerInput?: MidiPortSelection | false;
  controllerOutput?: MidiPortSelection | false;
  midiMapper?: {
    id?: string;
    name?: string;
    activeTrack?: number;
    globalMappings?: CompiledInstrumentMidiMapperProps["globalMappings"];
  };
  navigation?: Partial<InstrumentNavigationState>;
  master?:
    | {
        id?: string;
        name?: string;
      }
    | false;
};

export type CompiledInstrumentEnginePatch = {
  compiledInstrument: CompiledInstrument;
  patch: IEngineSerialize;
  runtime: {
    masterId?: string;
    transportControlId: string;
    sessionRecorderId: string;
    metronomeId: string;
    midiMapperId: string;
    noteInputId?: string;
    controllerInputId?: string;
    controllerOutputId?: string;
    midiMapperGlobalMappings: CompiledInstrumentMidiMapperProps["globalMappings"];
    navigation: InstrumentNavigationState;
    stepSequencerIds: Record<string, string>;
  };
};
