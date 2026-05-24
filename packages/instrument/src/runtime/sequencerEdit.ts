import type { MidiEvent } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  launchControlXL3SequencerEdit,
  type LaunchControlXL3SequencerEditEngine,
  type LaunchControlXL3SequencerEditUpdate,
} from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerEdit";

export type SeqEditUpdate = LaunchControlXL3SequencerEditUpdate;
export type SeqEditStepLedSyncEngine = LaunchControlXL3SequencerEditEngine;

export function syncSeqEditStepButtonLeds(
  engine: SeqEditStepLedSyncEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  launchControlXL3SequencerEdit.syncStepButtonLeds(engine, runtimePatch);
}

export function createSeqEditDisplayState(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  return launchControlXL3SequencerEdit.createDisplayState(runtimePatch);
}

export function createSeqEditPageSync(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  return launchControlXL3SequencerEdit.createPageSync(runtimePatch);
}

export function applySeqEditEncoderEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: NonNullable<MidiEvent["cc"]>,
  ccValue: NonNullable<MidiEvent["ccValue"]>,
) {
  return launchControlXL3SequencerEdit.applyEncoderEvent(
    runtimePatch,
    cc,
    ccValue,
  );
}
