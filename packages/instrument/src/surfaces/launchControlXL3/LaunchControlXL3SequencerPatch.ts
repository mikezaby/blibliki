import {
  type IStepSequencerProps,
  type IUpdateModule,
  ModuleType,
  PlaybackMode,
  Resolution,
} from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  getRelativeDelta,
  mapRelativeBoolean,
  mapRelativeEnum,
  mapRelativeNumber,
  mapRelativePitch,
  mapRelativeVelocity,
} from "./LaunchControlXL3RelativeEncoder";
import {
  DEFAULT_NEW_NOTE_VELOCITY,
  DURATION_OPTIONS,
  PITCH_CCS,
  PLAYBACK_OPTIONS,
  RESOLUTION_OPTIONS,
  STEP_CONTROL_CCS,
  VELOCITY_CCS,
} from "./LaunchControlXL3SequencerControls";
import { getStepSequencerProps } from "./LaunchControlXL3SequencerState";
import {
  updateActiveStep,
  updateStepNoteSlot,
} from "./LaunchControlXL3SequencerStepUpdates";

export type LaunchControlXL3SequencerEditUpdate = {
  runtimePatch: CompiledInstrumentEnginePatch;
  update: IUpdateModule<ModuleType.StepSequencer>;
};

function updateRuntimePatchStepSequencerProps(
  runtimePatch: CompiledInstrumentEnginePatch,
  moduleId: string,
  changes: Partial<IStepSequencerProps>,
): LaunchControlXL3SequencerEditUpdate {
  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module?.moduleType !== ModuleType.StepSequencer) {
    throw new Error("Active track is missing a step sequencer module");
  }

  const props = module.props as IStepSequencerProps;
  const nextProps = {
    ...props,
    ...changes,
  };

  return {
    runtimePatch: {
      ...runtimePatch,
      patch: {
        ...runtimePatch.patch,
        modules: runtimePatch.patch.modules.map((candidate) =>
          candidate.id === moduleId
            ? {
                ...candidate,
                props: nextProps,
              }
            : candidate,
        ),
      },
    },
    update: {
      id: moduleId,
      moduleType: ModuleType.StepSequencer,
      changes: {
        props: changes,
      },
    },
  };
}

export function createLaunchControlXL3SequencerPageSync(
  runtimePatch: CompiledInstrumentEnginePatch,
): LaunchControlXL3SequencerEditUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  return updateRuntimePatchStepSequencerProps(
    runtimePatch,
    stepSequencer.moduleId,
    {
      activePageNo: runtimePatch.runtime.navigation.sequencerPageIndex,
    },
  );
}

export function applyLaunchControlXL3SequencerEncoderEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  ccValue: number,
): LaunchControlXL3SequencerEditUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const delta = getRelativeDelta(ccValue);
  if (delta === 0) {
    return null;
  }

  const velocityIndex = VELOCITY_CCS.indexOf(
    cc as (typeof VELOCITY_CCS)[number],
  );
  if (velocityIndex >= 0) {
    return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
      patterns: updateActiveStep(props, runtimePatch, (step) =>
        updateStepNoteSlot(step, velocityIndex, {
          velocity: mapRelativeVelocity(
            step.notes[velocityIndex]?.velocity ?? DEFAULT_NEW_NOTE_VELOCITY,
            delta,
          ),
        }),
      ),
    });
  }

  const pitchIndex = PITCH_CCS.indexOf(cc as (typeof PITCH_CCS)[number]);
  if (pitchIndex >= 0) {
    return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
      patterns: updateActiveStep(props, runtimePatch, (step) =>
        updateStepNoteSlot(step, pitchIndex, {
          note: mapRelativePitch(step.notes[pitchIndex]?.note, delta),
        }),
      ),
    });
  }

  switch (cc) {
    case STEP_CONTROL_CCS[0]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          active: mapRelativeBoolean(step.active, delta),
        })),
      });
    case STEP_CONTROL_CCS[1]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          probability: mapRelativeNumber(step.probability, delta, 0, 100),
        })),
      });
    case STEP_CONTROL_CCS[2]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          duration: mapRelativeEnum(
            step.duration,
            delta,
            DURATION_OPTIONS,
            DURATION_OPTIONS[0] ?? "1/16",
          ),
        })),
      });
    case STEP_CONTROL_CCS[3]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          microtimeOffset: mapRelativeNumber(
            step.microtimeOffset,
            delta,
            -100,
            100,
          ),
        })),
      });
    case STEP_CONTROL_CCS[4]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        resolution: mapRelativeEnum(
          props.resolution,
          delta,
          RESOLUTION_OPTIONS,
          Resolution.sixteenth,
        ),
      });
    case STEP_CONTROL_CCS[5]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        playbackMode: mapRelativeEnum(
          props.playbackMode,
          delta,
          PLAYBACK_OPTIONS,
          PlaybackMode.loop,
        ),
      });
    case STEP_CONTROL_CCS[7]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        loopLength: mapRelativeNumber(props.loopLength, delta, 1, 4),
      });
    default:
      return null;
  }
}
