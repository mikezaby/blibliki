import { moduleSchemas, ModuleType } from "@blibliki/engine";
import {
  createMasterTrackDocument,
  isMasterTrackDocument,
} from "./masterTrack";
import type {
  InstrumentTrackControllerSlotValues,
  InstrumentDocument,
} from "./types";

export const CURRENT_INSTRUMENT_VERSION = "3";
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

export function normalizeMasterVolume(document: InstrumentDocument) {
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

// Brings a stored document up to CURRENT_INSTRUMENT_VERSION so callers (e.g. the
// editor) always work in current-format units. Without this, a v1 document's
// masterVolume (legacy linear gain) is re-converted to dB on every compile,
// corrupting any dB value written back against the old version. v2 -> v3 also
// moves the global effect chain onto a master track.
export function migrateInstrumentDocument(
  document: InstrumentDocument,
): InstrumentDocument {
  if (document.version === CURRENT_INSTRUMENT_VERSION) {
    return document;
  }

  const legacy = document.globalBlock as unknown as LegacyGlobalBlock;
  const tracks = document.tracks.some(isMasterTrackDocument)
    ? document.tracks
    : [...document.tracks, createMigratedMasterTrack(legacy)];

  return {
    ...document,
    version: CURRENT_INSTRUMENT_VERSION,
    globalBlock: {
      tempo: document.globalBlock.tempo,
      swing: document.globalBlock.swing,
      masterVolume: normalizeMasterVolume(document),
      probabilityAmount: document.globalBlock.probabilityAmount,
    },
    tracks,
  };
}
