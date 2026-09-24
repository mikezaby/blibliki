import { MidiEvent, ModuleType } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  getActiveStepSequencerId,
  getStepStates,
  type StepState,
} from "@/sequencer/stepEntry";
import {
  STEP_BUTTON_CCS,
  STEP_LED_HELD,
  STEP_LED_OFF,
  STEP_LED_PLAYHEAD,
  STEP_LED_PROGRAMMED,
} from "./LaunchControlXL3SequencerControls";

export type LaunchControlXL3SequencerEditEngine = {
  findModule: (id: string) => {
    moduleType?: ModuleType;
    state?: {
      currentStep?: unknown;
    };
    onMidiEvent?: (event: MidiEvent) => unknown;
  };
};

const STEP_LED_VALUES: Record<StepState, number> = {
  off: STEP_LED_OFF,
  programmed: STEP_LED_PROGRAMMED,
  held: STEP_LED_HELD,
  source: STEP_LED_HELD,
};

export function syncLaunchControlXL3SequencerStepButtonLeds(
  engine: LaunchControlXL3SequencerEditEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const controllerOutputId = runtimePatch.runtime.controllerOutputId;
  if (!controllerOutputId) {
    return;
  }

  const controllerOutput = engine.findModule(controllerOutputId);
  if (
    controllerOutput.moduleType !== ModuleType.MidiOutput ||
    typeof controllerOutput.onMidiEvent !== "function"
  ) {
    return;
  }

  const ledValues = getStepStates(runtimePatch).map(
    (state) => STEP_LED_VALUES[state],
  );
  const stepSequencerId = getActiveStepSequencerId(runtimePatch);
  let currentStep: number | undefined;

  if (stepSequencerId) {
    const liveStepSequencer = engine.findModule(stepSequencerId);
    if (
      liveStepSequencer.moduleType === ModuleType.StepSequencer &&
      typeof liveStepSequencer.state?.currentStep === "number"
    ) {
      currentStep = liveStepSequencer.state.currentStep;
    }
  }

  ledValues.forEach((value, index) => {
    const nextValue = currentStep === index ? STEP_LED_PLAYHEAD : value;
    const cc = STEP_BUTTON_CCS[index];
    if (cc === undefined) {
      return;
    }

    controllerOutput.onMidiEvent?.(MidiEvent.fromCC(cc, nextValue, 0));
  });
}
