import { PlaybackMode, Resolution } from "@blibliki/engine";
import type {
  InstrumentTrackAudioSource,
  SlotInitialValue,
} from "@blibliki/instrument";

export type InstrumentSequencerDivision =
  | "1/64"
  | "1/48"
  | "1/32"
  | "1/24"
  | "1/16"
  | "1/12"
  | "1/8"
  | "1/6"
  | "3/16"
  | "1/4"
  | "5/16"
  | "1/3"
  | "3/8"
  | "1/2"
  | "3/4"
  | "1"
  | "1.5"
  | "2"
  | "3"
  | "4"
  | "6"
  | "8"
  | "16"
  | "32";

export type InstrumentNoteSource = "externalMidi" | "stepSequencer";

export type SourceProfileId =
  | "unassigned"
  | "osc"
  | "wavetable"
  | "noise"
  | "threeOsc"
  | "drumMachine";

export type EffectProfileId =
  | "none"
  | "distortion"
  | "compressor"
  | "chorus"
  | "delay"
  | "reverb";
export type InstrumentLatencyHint = "interactive" | "playback";

export type InstrumentGlobalBlock = {
  tempo: number;
  swing: number;
  masterVolume: number;
  probabilityAmount: number;
};

export type InstrumentSequencerNote = {
  note: string;
  velocity: number;
};

export type InstrumentSequencerCC = {
  cc: number;
  value: number;
};

export type InstrumentSequencerStep = {
  active: boolean;
  notes: InstrumentSequencerNote[];
  ccMessages?: InstrumentSequencerCC[];
  probability: number;
  microtimeOffset: number;
  duration: InstrumentSequencerDivision;
};

export type InstrumentSequencerPage = {
  name: string;
  steps: InstrumentSequencerStep[];
};

export type InstrumentTrackSequencer = {
  pages: InstrumentSequencerPage[];
  loopLength: 1 | 2 | 3 | 4;
  resolution: Resolution;
  playbackMode: PlaybackMode;
};

export type InstrumentTrackControllerSlotValues = Record<
  string,
  SlotInitialValue
>;

export type InstrumentTrackDocument = {
  key: string;
  name?: string;
  enabled?: boolean;
  voices?: number;
  noteSource: InstrumentNoteSource;
  audioSource?: InstrumentTrackAudioSource;
  midiChannel: number;
  sourceProfileId: SourceProfileId;
  fxChain: [EffectProfileId, EffectProfileId, EffectProfileId, EffectProfileId];
  controllerSlotValues?: InstrumentTrackControllerSlotValues;
  sequencer: InstrumentTrackSequencer;
};

export type InstrumentDocument = {
  version: string;
  name: string;
  templateId: string;
  hardwareProfileId: string;
  latencyHint?: InstrumentLatencyHint;
  globalBlock: InstrumentGlobalBlock;
  tracks: InstrumentTrackDocument[];
};

const DEFAULT_VERSION = "3";
const MASTER_TRACK_KEY = "master";
const DEFAULT_NAME = "Default Instrument";
const DEFAULT_TEMPLATE_ID = "default-performance-instrument";
const DEFAULT_HARDWARE_PROFILE_ID = "launchcontrolxl3-pi-lcd";
const DEFAULT_FX_CHAIN: [
  EffectProfileId,
  EffectProfileId,
  EffectProfileId,
  EffectProfileId,
] = ["distortion", "chorus", "delay", "reverb"];

function createDefaultSequencerStep(): InstrumentSequencerStep {
  return {
    active: false,
    notes: [],
    ccMessages: [],
    probability: 100,
    microtimeOffset: 0,
    duration: "1/16",
  };
}

function createDefaultTrack(trackNo: number): InstrumentTrackDocument {
  return {
    key: `track-${trackNo}`,
    enabled: true,
    voices: 8,
    midiChannel: trackNo,
    noteSource: "externalMidi",
    audioSource: { type: "internal" },
    sourceProfileId: "unassigned",
    fxChain: [...DEFAULT_FX_CHAIN] as InstrumentTrackDocument["fxChain"],
    sequencer: {
      loopLength: 1,
      resolution: Resolution.sixteenth,
      playbackMode: PlaybackMode.loop,
      pages: Array.from({ length: 4 }, (_, index) => ({
        name: `Page ${index + 1}`,
        steps: Array.from({ length: 16 }, () => createDefaultSequencerStep()),
      })),
    },
  };
}

// The master track: a clean audio bus that all tracks feed into and which
// outputs to the engine Master. Handled like any other track.
function createMasterTrack(): InstrumentTrackDocument {
  return {
    key: MASTER_TRACK_KEY,
    name: "Master",
    enabled: true,
    voices: 1,
    midiChannel: 16,
    noteSource: "externalMidi",
    audioSource: { type: "master" },
    sourceProfileId: "unassigned",
    fxChain: ["none", "none", "none", "none"],
    sequencer: {
      loopLength: 1,
      resolution: Resolution.sixteenth,
      playbackMode: PlaybackMode.loop,
      pages: [{ name: "Page 1", steps: [] }],
    },
  };
}

export function createDefaultInstrumentDocument(): InstrumentDocument {
  return {
    version: DEFAULT_VERSION,
    name: DEFAULT_NAME,
    templateId: DEFAULT_TEMPLATE_ID,
    hardwareProfileId: DEFAULT_HARDWARE_PROFILE_ID,
    latencyHint: "interactive",
    globalBlock: {
      tempo: 120,
      swing: 0,
      masterVolume: 0,
      probabilityAmount: 1,
    },
    tracks: [
      ...Array.from({ length: 8 }, (_, index) => createDefaultTrack(index + 1)),
      createMasterTrack(),
    ],
  };
}
