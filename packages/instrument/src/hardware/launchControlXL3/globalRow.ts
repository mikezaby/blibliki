import { ModuleType } from "@blibliki/engine";
import { getValueSpecForModuleProp } from "@/blocks/helpers";
import type { InstrumentGlobalBlock } from "@/document/types";
import { GLOBAL_MACRO_SLOT_IDS } from "@/macros/defaultMacros";
import type { Fixed8, ValueSpec } from "@/types";

export type InstrumentGlobalControlKey = keyof InstrumentGlobalBlock;

// `key: null` reserves an unused encoder position. The former master filter /
// reverb / delay controls (knobs 3-6) now live on the master track, so those
// positions are left unmapped while Tempo/Swing/Prob/Volume keep their knobs.
export type LaunchControlXL3GlobalControl = {
  key: InstrumentGlobalControlKey | null;
  slotId?: string;
  label: string;
  shortLabel: string;
  cc: number;
};

const MACRO_GLOBAL_CONTROL = (
  slotId: string,
  cc: number,
): LaunchControlXL3GlobalControl => ({
  key: null,
  slotId,
  label: "",
  shortLabel: "",
  cc,
});

export const launchControlXL3GlobalRow: Fixed8<LaunchControlXL3GlobalControl> =
  [
    {
      key: "tempo",
      label: "Tempo",
      shortLabel: "BPM",
      cc: 13,
    },
    {
      key: "swing",
      label: "Swing",
      shortLabel: "SWG",
      cc: 14,
    },
    MACRO_GLOBAL_CONTROL(GLOBAL_MACRO_SLOT_IDS[0], 15),
    MACRO_GLOBAL_CONTROL(GLOBAL_MACRO_SLOT_IDS[1], 16),
    MACRO_GLOBAL_CONTROL(GLOBAL_MACRO_SLOT_IDS[2], 17),
    MACRO_GLOBAL_CONTROL(GLOBAL_MACRO_SLOT_IDS[3], 18),
    {
      key: "probabilityAmount",
      label: "Prob Amount",
      shortLabel: "P-AMT",
      cc: 19,
    },
    {
      key: "masterVolume",
      label: "Main Volume",
      shortLabel: "VOL",
      cc: 20,
    },
  ];

export function getGlobalControlValueSpec(
  key: InstrumentGlobalControlKey,
): ValueSpec {
  switch (key) {
    case "tempo":
      return getValueSpecForModuleProp(ModuleType.TransportControl, "bpm");
    case "swing":
      return getValueSpecForModuleProp(ModuleType.TransportControl, "swing");
    case "masterVolume":
      return getValueSpecForModuleProp(ModuleType.Volume, "volume");
    case "probabilityAmount":
      return getValueSpecForModuleProp(
        ModuleType.StepSequencer,
        "probabilityAmount",
      );
    default:
      key satisfies never;
      throw Error(`Unknown global control key ${String(key)}`);
  }
}
