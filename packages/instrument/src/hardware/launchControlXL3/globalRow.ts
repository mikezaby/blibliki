import type { InstrumentGlobalBlock } from "@/document/types";
import type { Fixed8 } from "@/types";

export type InstrumentGlobalControlKey = keyof InstrumentGlobalBlock;

export type LaunchControlXL3GlobalControl = {
  key: InstrumentGlobalControlKey;
  label: string;
  shortLabel: string;
  cc: number;
};

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
    {
      key: "masterFilterCutoff",
      label: "Master Filter Cutoff",
      shortLabel: "MCF",
      cc: 15,
    },
    {
      key: "masterFilterResonance",
      label: "Master Filter Resonance",
      shortLabel: "MRQ",
      cc: 16,
    },
    {
      key: "reverbSend",
      label: "Reverb Send",
      shortLabel: "REV",
      cc: 17,
    },
    {
      key: "delaySend",
      label: "Delay Send",
      shortLabel: "DLY",
      cc: 18,
    },
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
