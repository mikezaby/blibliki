import DrumMachineBlock from "@/blocks/source/DrumMachineBlock";
import NoiseBlock from "@/blocks/source/NoiseBlock";
import OscBlock from "@/blocks/source/OscBlock";
import ThreeOscBlock from "@/blocks/source/ThreeOscBlock";
import UnassignedSourceBlock from "@/blocks/source/UnassignedSourceBlock";
import WavetableBlock from "@/blocks/source/WavetableBlock";
import type { SourceProfileId } from "@/document/types";
import type { PageSlotRef } from "@/pages/Page";
import type { Fixed8 } from "@/types";
import { createTrackSlots } from "./TrackPageSlots";

export function createSourceBlock(
  sourceProfileId: SourceProfileId,
  voices: number,
) {
  switch (sourceProfileId) {
    case "unassigned":
      return new UnassignedSourceBlock();
    case "osc":
      return new OscBlock(voices);
    case "wavetable":
      return new WavetableBlock(voices);
    case "noise":
      return new NoiseBlock();
    case "threeOsc":
      return new ThreeOscBlock(voices);
    case "drumMachine":
      return new DrumMachineBlock();
  }
}

export function createSourcePageSlots(
  sourceProfileId: SourceProfileId,
): Fixed8<PageSlotRef> {
  switch (sourceProfileId) {
    case "unassigned":
      return createTrackSlots("source", []);
    case "osc":
      return createTrackSlots("source", [
        "wave",
        "frequency",
        "octave",
        "coarse",
        "fine",
        "lowGain",
      ]);
    case "wavetable":
      return createTrackSlots("source", [
        "position",
        "frequency",
        "octave",
        "coarse",
        "fine",
        "lowGain",
      ]);
    case "noise":
      return createTrackSlots("source", ["type"]);
    case "threeOsc":
      return createTrackSlots("source", [
        "wave1",
        "coarse1",
        "wave2",
        "coarse2",
        "wave3",
        "coarse3",
        "gain",
      ]);
    case "drumMachine":
      return createTrackSlots("source", [
        "kickLevel",
        "snareLevel",
        "clapLevel",
        "closedHatLevel",
        "tomLevel",
        "openHatLevel",
        "cymbalLevel",
        "cowbellLevel",
      ]);
  }
}
