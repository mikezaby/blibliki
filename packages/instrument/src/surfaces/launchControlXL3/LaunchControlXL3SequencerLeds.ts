import { MidiEvent, ModuleType } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  STEP_BUTTON_CCS,
  STEP_LED_OFF,
  STEP_LED_PLAYHEAD,
  STEP_LED_PROGRAMMED,
  STEP_LED_SELECTED,
} from "./LaunchControlXL3SequencerControls";
import {
  getActiveStepSequencerId,
  getStepSequencerProps,
} from "./LaunchControlXL3SequencerPatch";

export type LaunchControlXL3SequencerEditEngine = {
  findModule: (id: string) => {
    moduleType?: ModuleType;
    state?: {
      currentStep?: unknown;
    };
    onMidiEvent?: (event: MidiEvent) => unknown;
  };
};

function createStepLedValues(runtimePatch: CompiledInstrumentEnginePatch) {
  if (runtimePatch.runtime.navigation.mode !== "seqEdit") {
    return STEP_BUTTON_CCS.map(() => STEP_LED_OFF);
  }

  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return STEP_BUTTON_CCS.map(() => STEP_LED_OFF);
  }

  const { props } = stepSequencer;
  const pattern = props.patterns[props.activePatternNo] ?? props.patterns[0];
  const page =
    pattern?.pages[runtimePatch.runtime.navigation.sequencerPageIndex];
  const steps = page?.steps ?? [];

  return STEP_BUTTON_CCS.map((_, stepIndex) => {
    if (stepIndex === runtimePatch.runtime.navigation.selectedStepIndex) {
      return STEP_LED_SELECTED;
    }

    const step = steps[stepIndex];
    if (!step) {
      return STEP_LED_OFF;
    }

    return step.notes.length > 0 || step.ccMessages.length > 0
      ? STEP_LED_PROGRAMMED
      : STEP_LED_OFF;
  });
}

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

  const ledValues = createStepLedValues(runtimePatch);
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
