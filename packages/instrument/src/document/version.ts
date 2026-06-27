import { moduleSchemas, ModuleType } from "@blibliki/engine";
import type { InstrumentDocument } from "./types";

export const CURRENT_INSTRUMENT_VERSION = "2";
const volumeSchema = moduleSchemas[ModuleType.Volume].volume;

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

// Brings a stored document up to CURRENT_INSTRUMENT_VERSION so callers (e.g. the
// editor) always work in current-format units. Without this, a v1 document's
// masterVolume (legacy linear gain) is re-converted to dB on every compile,
// corrupting any dB value written back against the old version.
export function migrateInstrumentDocument(
  document: InstrumentDocument,
): InstrumentDocument {
  if (document.version === CURRENT_INSTRUMENT_VERSION) {
    return document;
  }

  return {
    ...document,
    version: CURRENT_INSTRUMENT_VERSION,
    globalBlock: {
      ...document.globalBlock,
      masterVolume: normalizeMasterVolume(document),
    },
  };
}
