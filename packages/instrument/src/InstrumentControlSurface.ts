import { MidiEvent } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  launchControlXL3Surface,
  type LaunchControlXL3Result,
} from "@/surfaces/launchControlXL3/LaunchControlXL3Surface";

export type InstrumentControllerResult = LaunchControlXL3Result;

export function reduceInstrumentControllerEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  event: MidiEvent,
): InstrumentControllerResult {
  return launchControlXL3Surface.reduceEvent(runtimePatch, event);
}
