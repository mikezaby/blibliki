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
