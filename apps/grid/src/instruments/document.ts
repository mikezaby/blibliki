import { PlaybackMode, Resolution } from "@blibliki/engine";

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
  | "threeOsc";

export type EffectProfileId = "distortion" | "chorus" | "delay" | "reverb";

export type InstrumentGlobalBlock = {
  tempo: number;
  swing: number;
  masterFilterCutoff: number;
  masterFilterResonance: number;
  reverbSend: number;
  delaySend: number;
  masterVolume: number;
};

export type InstrumentSequencerNote = {
  note: string;
  velocity: number;
};

export type InstrumentSequencerStep = {
  active: boolean;
  notes: InstrumentSequencerNote[];
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

export type InstrumentTrackDocument = {
  key: string;
  name?: string;
  enabled?: boolean;
  voices?: number;
  noteSource: InstrumentNoteSource;
  midiChannel: number;
  sourceProfileId: SourceProfileId;
  fxChain: [EffectProfileId, EffectProfileId, EffectProfileId, EffectProfileId];
  sequencer: InstrumentTrackSequencer;
};

export type InstrumentDocument = {
  version: string;
  name: string;
  templateId: string;
  hardwareProfileId: string;
  globalBlock: InstrumentGlobalBlock;
  tracks: InstrumentTrackDocument[];
};

const DEFAULT_VERSION = "1";
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

export function createDefaultInstrumentDocument(): InstrumentDocument {
  return {
    version: DEFAULT_VERSION,
    name: DEFAULT_NAME,
    templateId: DEFAULT_TEMPLATE_ID,
    hardwareProfileId: DEFAULT_HARDWARE_PROFILE_ID,
    globalBlock: {
      tempo: 120,
      swing: 0,
      masterFilterCutoff: 20_000,
      masterFilterResonance: 1,
      reverbSend: 0,
      delaySend: 0,
      masterVolume: 1,
    },
    tracks: Array.from({ length: 8 }, (_, index) =>
      createDefaultTrack(index + 1),
    ),
  };
}
