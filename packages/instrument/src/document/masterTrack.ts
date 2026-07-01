import { PlaybackMode, Resolution } from "@blibliki/engine";
import type {
  InstrumentTrackControllerSlotValues,
  InstrumentTrackDocument,
} from "./types";

export const MASTER_TRACK_KEY = "master";

// The master track has no note source, so its sequencer is inert; it exists
// only to satisfy the shared track document shape.
function createInertSequencer(): InstrumentTrackDocument["sequencer"] {
  return {
    loopLength: 1,
    resolution: Resolution.sixteenth,
    playbackMode: PlaybackMode.loop,
    pages: [{ name: "Page 1", steps: [] }],
  };
}

export function createMasterTrackDocument(
  overrides: {
    fxChain?: InstrumentTrackDocument["fxChain"];
    controllerSlotValues?: InstrumentTrackControllerSlotValues;
  } = {},
): InstrumentTrackDocument {
  return {
    key: MASTER_TRACK_KEY,
    name: "Master",
    enabled: true,
    voices: 1,
    midiChannel: 16,
    noteSource: "externalMidi",
    audioSource: { type: "master" },
    sourceProfileId: "unassigned",
    fxChain: overrides.fxChain ?? ["none", "none", "none", "none"],
    controllerSlotValues: overrides.controllerSlotValues,
    sequencer: createInertSequencer(),
  };
}

export function isMasterTrackDocument(trackDocument: InstrumentTrackDocument) {
  return trackDocument.audioSource?.type === "master";
}
