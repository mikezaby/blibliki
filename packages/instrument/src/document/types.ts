import type { PlaybackMode, Resolution } from "@blibliki/engine";
import type { SlotInitialValue } from "@/slots/BaseSlot";

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

export type EffectProfileId = "distortion" | "chorus" | "delay" | "reverb";
export type InstrumentLatencyHint = "interactive" | "playback";

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
