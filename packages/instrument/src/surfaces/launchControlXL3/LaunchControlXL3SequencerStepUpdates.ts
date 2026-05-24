import { type IStep, type IStepSequencerProps } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import { DEFAULT_NEW_NOTE_VELOCITY } from "./LaunchControlXL3SequencerControls";

export function updateActiveStep(
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

export function updateStepNoteSlot(
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
