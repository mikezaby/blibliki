import { type IStepSequencerProps, ModuleType } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";

export type ActiveStepSequencer = {
  moduleId: string;
  props: IStepSequencerProps;
};

export function getActiveStepSequencerId(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[
      runtimePatch.runtime.navigation.activeTrackIndex
    ];
  if (!activeTrack) {
    return;
  }

  return runtimePatch.runtime.stepSequencerIds[activeTrack.key];
}

export function getStepSequencerProps(
  runtimePatch: CompiledInstrumentEnginePatch,
): ActiveStepSequencer | null {
  const moduleId = getActiveStepSequencerId(runtimePatch);
  if (!moduleId) {
    return null;
  }

  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module?.moduleType !== ModuleType.StepSequencer) {
    return null;
  }

  return {
    moduleId,
    props: module.props as IStepSequencerProps,
  };
}

export function getActiveStep(
  props: IStepSequencerProps,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const pattern = props.patterns[props.activePatternNo] ?? props.patterns[0];
  const page =
    pattern?.pages[runtimePatch.runtime.navigation.sequencerPageIndex];
  const step = page?.steps[runtimePatch.runtime.navigation.selectedStepIndex];

  return {
    pattern,
    page,
    step,
  };
}
