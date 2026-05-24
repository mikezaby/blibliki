import {
  type IStep,
  type IStepSequencerProps,
  type IUpdateModule,
  ModuleType,
  Note,
  PlaybackMode,
  Resolution,
} from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  DEFAULT_NEW_NOTE,
  DEFAULT_NEW_NOTE_VELOCITY,
  DURATION_OPTIONS,
  NOTE_NAMES,
  PITCH_CCS,
  PITCH_MAX_MIDI,
  PITCH_MIN_MIDI,
  PLAYBACK_OPTIONS,
  RELATIVE_PIVOT,
  RESOLUTION_OPTIONS,
  STEP_CONTROL_CCS,
  VELOCITY_CCS,
} from "./LaunchControlXL3SequencerControls";

export type LaunchControlXL3SequencerEditUpdate = {
  runtimePatch: CompiledInstrumentEnginePatch;
  update: IUpdateModule<ModuleType.StepSequencer>;
};

export type ActiveStepSequencer = {
  moduleId: string;
  props: IStepSequencerProps;
};

function clampRelativeValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRelativeDelta(value: number) {
  return value - RELATIVE_PIVOT;
}

function mapRelativeBoolean(currentValue: boolean, delta: number) {
  if (delta === 0) {
    return currentValue;
  }

  return delta > 0;
}

function mapRelativeNumber(
  currentValue: number,
  delta: number,
  min: number,
  max: number,
) {
  return clampRelativeValue(currentValue + delta, min, max);
}

function mapRelativeEnum<T extends string>(
  currentValue: T,
  delta: number,
  options: readonly T[],
  fallback: T,
) {
  const currentIndex = options.indexOf(currentValue);
  const fallbackIndex = options.indexOf(fallback);
  const baseIndex =
    currentIndex >= 0 ? currentIndex : Math.max(fallbackIndex, 0);
  const index = clampRelativeValue(baseIndex + delta, 0, options.length - 1);

  return options[index] ?? fallback;
}

function mapRelativeVelocity(currentValue: number, delta: number) {
  return clampRelativeValue(currentValue + delta, 0, 127);
}

function midiNumberToNoteName(midiNumber: number) {
  const noteName = NOTE_NAMES[midiNumber % 12] ?? NOTE_NAMES[0];
  const octave = Math.floor(midiNumber / 12) - 2;

  return `${noteName}${octave}`;
}

function mapRelativePitch(
  currentNote: string | null | undefined,
  delta: number,
) {
  if (delta === 0) {
    return currentNote ?? null;
  }

  if (!currentNote && delta < 0) {
    return null;
  }

  const baseMidi = currentNote
    ? new Note(currentNote).midiNumber
    : new Note(DEFAULT_NEW_NOTE).midiNumber - 1;
  const nextMidi = baseMidi + delta;

  if (nextMidi < PITCH_MIN_MIDI) {
    return null;
  }

  return midiNumberToNoteName(
    clampRelativeValue(nextMidi, PITCH_MIN_MIDI, PITCH_MAX_MIDI),
  );
}

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

function updateActiveStep(
  props: IStepSequencerProps,
  runtimePatch: CompiledInstrumentEnginePatch,
  updater: (step: IStep) => IStep,
) {
  return props.patterns.map((pattern, patternIndex) => {
    if (patternIndex !== props.activePatternNo) {
      return pattern;
    }

    return {
      ...pattern,
      pages: pattern.pages.map((page, pageIndex) => {
        if (pageIndex !== runtimePatch.runtime.navigation.sequencerPageIndex) {
          return page;
        }

        return {
          ...page,
          steps: page.steps.map((step, stepIndex) =>
            stepIndex === runtimePatch.runtime.navigation.selectedStepIndex
              ? updater(step)
              : step,
          ),
        };
      }),
    };
  });
}

function updateStepNoteSlot(
  step: IStep,
  noteIndex: number,
  change:
    | {
        velocity: number;
      }
    | {
        note: string | null;
      },
) {
  const notes = [...step.notes];

  if ("velocity" in change) {
    const note = notes[noteIndex];
    if (!note) {
      return step;
    }

    notes[noteIndex] = {
      ...note,
      velocity: change.velocity,
    };

    return {
      ...step,
      notes,
    };
  }

  if (change.note === null) {
    if (!notes[noteIndex]) {
      return step;
    }

    notes.splice(noteIndex, 1);
  } else {
    const existingNote = notes[noteIndex];

    if (existingNote) {
      notes[noteIndex] = {
        ...existingNote,
        note: change.note,
      };
    } else if (noteIndex === notes.length) {
      notes.push({
        note: change.note,
        velocity: DEFAULT_NEW_NOTE_VELOCITY,
      });
    } else {
      return step;
    }
  }

  let active = step.active;
  if (step.notes.length === 0 && notes.length > 0) {
    active = true;
  }
  if (notes.length === 0) {
    active = false;
  }

  return {
    ...step,
    active,
    notes,
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
