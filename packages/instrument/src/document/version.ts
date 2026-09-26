import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { createDefaultGlobalController } from "@/macros/defaultMacros";
import {
  createMasterTrackDocument,
  isMasterTrackDocument,
} from "./masterTrack";
import type {
  InstrumentTrackControllerSlotValues,
  InstrumentDocument,
  InstrumentTrackDocument,
} from "./types";

export const CURRENT_INSTRUMENT_VERSION = "4";
const volumeSchema = moduleSchemas[ModuleType.Volume].volume;

// The former global effect fields, present on v1/v2 documents but dropped from
// InstrumentGlobalBlock in v3 (they now live on the master track).
type LegacyGlobalBlock = {
  masterVolume: number;
  masterFilterCutoff?: number;
  masterFilterResonance?: number;
  reverbSend?: number;
  delaySend?: number;
};
type LegacyInstrumentDocument = Omit<InstrumentDocument, "globalController"> & {
  globalController?: InstrumentDocument["globalController"];
};

function hasGlobalController(
  document: LegacyInstrumentDocument,
): document is InstrumentDocument {
  return document.globalController !== undefined;
}

export function normalizeMasterVolume(
  document: Pick<InstrumentDocument, "globalBlock" | "version">,
) {
  if (document.version !== "1") {
    return document.globalBlock.masterVolume;
  }

  const gain = document.globalBlock.masterVolume;
  if (gain <= 0) {
    return volumeSchema.min;
  }

  const volume = 20 * Math.log10(gain);
  return Math.min(volumeSchema.max, Math.max(volumeSchema.min, volume));
}

// Recreates the pre-v3 global effect chain (filter -> delay -> reverb) as a
// master track, so migrated documents keep their sound. Values carry over via
// controller slots on the master track's filter and fx blocks.
function createMigratedMasterTrack(legacy: LegacyGlobalBlock) {
  const controllerSlotValues: InstrumentTrackControllerSlotValues = {};
  if (typeof legacy.masterFilterCutoff === "number") {
    controllerSlotValues["filter.cutoff"] = legacy.masterFilterCutoff;
  }
  if (typeof legacy.masterFilterResonance === "number") {
    controllerSlotValues["filter.Q"] = legacy.masterFilterResonance;
  }
  if (typeof legacy.delaySend === "number") {
    controllerSlotValues["fx1.mix"] = legacy.delaySend;
  }
  if (typeof legacy.reverbSend === "number") {
    controllerSlotValues["fx2.mix"] = legacy.reverbSend;
  }

  return createMasterTrackDocument({
    fxChain: ["delay", "reverb", "none", "none"],
    controllerSlotValues:
      Object.keys(controllerSlotValues).length > 0
        ? controllerSlotValues
        : undefined,
  });
}

// v3 -> v4: the drum machine's fixed note map moved up two octaves, so drum
// patterns written on the old notes follow it.
const DRUM_NOTE_MOVES: Record<string, string> = {
  C1: "C3",
  D1: "D3",
  "D#1": "D#3",
  "F#1": "F#3",
  A1: "A3",
  "A#1": "A#3",
  "C#2": "C#4",
  "G#2": "G#4",
};

function moveDrumNotes(
  track: InstrumentTrackDocument,
): InstrumentTrackDocument {
  if (track.sourceProfileId !== "drumMachine") {
    return track;
  }

  return {
    ...track,
    sequencer: {
      ...track.sequencer,
      pages: track.sequencer.pages.map((page) => ({
        ...page,
        steps: page.steps.map((step) => ({
          ...step,
          notes: step.notes.map((note) => ({
            ...note,
            note: DRUM_NOTE_MOVES[note.note] ?? note.note,
          })),
        })),
      })),
    },
  };
}

// Brings a stored document up to CURRENT_INSTRUMENT_VERSION so callers (e.g. the
// editor) always work in current-format units. Without this, a v1 document's
// masterVolume (legacy linear gain) is re-converted to dB on every compile,
// corrupting any dB value written back against the old version. v2 -> v3 also
// moves the global effect chain onto a master track, and v3 -> v4 moves drum
// patterns with the drum machine's note map.
export function migrateInstrumentDocument(
  document: LegacyInstrumentDocument,
): InstrumentDocument {
  const globalController =
    document.globalController ?? createDefaultGlobalController();

  if (
    document.version === CURRENT_INSTRUMENT_VERSION &&
    hasGlobalController(document)
  ) {
    return document;
  }

  const legacy = document.globalBlock as unknown as LegacyGlobalBlock;
  const tracksWithMaster = document.tracks.some(isMasterTrackDocument)
    ? document.tracks
    : [...document.tracks, createMigratedMasterTrack(legacy)];
  const tracks = ["1", "2", "3"].includes(document.version)
    ? tracksWithMaster.map(moveDrumNotes)
    : tracksWithMaster;

  return {
    ...document,
    version: CURRENT_INSTRUMENT_VERSION,
    globalBlock: {
      tempo: document.globalBlock.tempo,
      swing: document.globalBlock.swing,
      masterVolume: normalizeMasterVolume(document),
      probabilityAmount: document.globalBlock.probabilityAmount,
    },
    globalController,
    tracks,
  };
}
