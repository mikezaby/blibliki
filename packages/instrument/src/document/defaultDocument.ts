import { PlaybackMode, Resolution } from "@blibliki/engine";
import { DEFAULT_HARDWARE_PROFILE_ID } from "@/profiles/hardwareProfile";
import { DEFAULT_TEMPLATE_ID } from "@/templates/defaultTemplate";
import type {
  EffectProfileId,
  InstrumentDocument,
  InstrumentSequencerStep,
  InstrumentTrackDocument,
} from "./types";

const DEFAULT_VERSION = "1";
const DEFAULT_NAME = "Default Instrument";
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

function createDefaultTrackSequencer(): InstrumentTrackDocument["sequencer"] {
  return {
    loopLength: 1,
    resolution: Resolution.sixteenth,
    playbackMode: PlaybackMode.loop,
    pages: Array.from({ length: 4 }, (_, index) => ({
      name: `Page ${index + 1}`,
      steps: Array.from({ length: 16 }, () => createDefaultSequencerStep()),
    })),
  };
}

function createDefaultTrack(trackNo: number): InstrumentTrackDocument {
  return {
    key: `track-${trackNo}`,
    enabled: true,
    midiChannel: trackNo,
    noteSource: "externalMidi",
    sourceProfileId: "unassigned",
    fxChain: [...DEFAULT_FX_CHAIN] as InstrumentTrackDocument["fxChain"],
    sequencer: createDefaultTrackSequencer(),
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
