import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  applyStepEntryControl,
  createStepEntryPageSync,
  type StepEntryControl,
  type StepEntryUpdate,
} from "@/sequencer/stepEntry";
import {
  getRelativeDelta,
  PITCH_CCS,
  STEP_CONTROL_CCS,
  VELOCITY_CCS,
} from "./LaunchControlXL3SequencerControls";

export type LaunchControlXL3SequencerEditUpdate = StepEntryUpdate;

const STEP_CONTROL_KINDS = [
  "active",
  "probability",
  "duration",
  "microtime",
  "resolution",
  "playbackMode",
  null,
  "loopLength",
] as const;

export function resolveLaunchControlXL3SequencerControl(
  cc: number,
): StepEntryControl | null {
  const velocitySlot = VELOCITY_CCS.indexOf(
    cc as (typeof VELOCITY_CCS)[number],
  );
  if (velocitySlot >= 0) {
    return { kind: "velocity", slot: velocitySlot };
  }

  const pitchSlot = PITCH_CCS.indexOf(cc as (typeof PITCH_CCS)[number]);
  if (pitchSlot >= 0) {
    return { kind: "pitch", slot: pitchSlot };
  }

  const controlIndex = STEP_CONTROL_CCS.indexOf(
    cc as (typeof STEP_CONTROL_CCS)[number],
  );
  const kind = controlIndex >= 0 ? STEP_CONTROL_KINDS[controlIndex] : null;

  return kind ? { kind } : null;
}

export function createLaunchControlXL3SequencerPageSync(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  return createStepEntryPageSync(runtimePatch);
}

export function applyLaunchControlXL3SequencerEncoderEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  ccValue: number,
): StepEntryUpdate | null {
  const control = resolveLaunchControlXL3SequencerControl(cc);
  if (!control) {
    return null;
  }

  return applyStepEntryControl(
    runtimePatch,
    control,
    getRelativeDelta(ccValue),
  );
}
