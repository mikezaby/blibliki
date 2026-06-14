import type { MidiEvent } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";
import { createLaunchControlXL3SequencerDisplayState } from "./LaunchControlXL3SequencerDisplay";
import {
  syncLaunchControlXL3SequencerStepButtonLeds,
  type LaunchControlXL3SequencerEditEngine,
} from "./LaunchControlXL3SequencerLeds";
import {
  applyLaunchControlXL3SequencerEncoderEvent,
  createLaunchControlXL3SequencerPageSync,
  type LaunchControlXL3SequencerEditUpdate,
} from "./LaunchControlXL3SequencerPatch";

export type {
  LaunchControlXL3SequencerEditEngine,
  LaunchControlXL3SequencerEditUpdate,
};

export type SeqEditUpdate = LaunchControlXL3SequencerEditUpdate;
export type SeqEditStepLedSyncEngine = LaunchControlXL3SequencerEditEngine;

export class LaunchControlXL3SequencerEdit {
  syncStepButtonLeds(
    engine: LaunchControlXL3SequencerEditEngine,
    runtimePatch: CompiledInstrumentEnginePatch,
  ) {
    syncLaunchControlXL3SequencerStepButtonLeds(engine, runtimePatch);
  }

  createDisplayState(
    runtimePatch: CompiledInstrumentEnginePatch,
  ): InstrumentDisplayState | null {
    return createLaunchControlXL3SequencerDisplayState(runtimePatch);
  }

  createPageSync(
    runtimePatch: CompiledInstrumentEnginePatch,
  ): LaunchControlXL3SequencerEditUpdate | null {
    return createLaunchControlXL3SequencerPageSync(runtimePatch);
  }

  applyEncoderEvent(
    runtimePatch: CompiledInstrumentEnginePatch,
    cc: number,
    ccValue: number,
  ): LaunchControlXL3SequencerEditUpdate | null {
    return applyLaunchControlXL3SequencerEncoderEvent(
      runtimePatch,
      cc,
      ccValue,
    );
  }
}

export const launchControlXL3SequencerEdit =
  new LaunchControlXL3SequencerEdit();

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
