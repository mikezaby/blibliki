import {
  type Division,
  divisionToTicks,
  type IStep,
  type IStepSequencerProps,
  microtimeOffsetForTicks,
  type StepSequencerPosition,
  stepPropSchema,
} from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
  HeldNote,
} from "@/compiler/instrumentTypes";
import type { MidiRecordingSettings } from "./recordingSettings";
import {
  getStepDefaults,
  getStepSequencerProps,
  MAX_STEP_NOTES,
  type StepEntryUpdate,
  updateStepSequencerProps,
  updateSteps,
} from "./stepEntry";

// Real-time record: where a played note lands in the loop, and how it is
// written. The session finds the position through the engine and applies
// the updates; nothing here needs the engine.

export type LiveRecordTarget = {
  pageIndex: number;
  stepIndex: number;
  // Passes over the loop since the transport started, from 0.
  lap: number;
  // Kept when the note is not snapped to a grid.
  microtimeOffset: number;
};

export function liveRecordLapSteps(props: IStepSequencerProps) {
  const pageCount = props.patterns[props.activePatternNo]?.pages.length ?? 1;

  return (
    Math.max(1, Math.min(props.loopLength, pageCount)) * props.stepsPerPage
  );
}

export function liveRecordTarget(
  props: IStepSequencerProps,
  position: StepSequencerPosition,
  quantize: MidiRecordingSettings["quantize"],
): LiveRecordTarget {
  const stepsPerLap = liveRecordLapSteps(props);
  // A grid finer than the track's step is the step.
  const gridTicks =
    quantize === "off"
      ? undefined
      : Math.max(position.stepTicks, divisionToTicks(quantize));
  const exactTicks =
    position.absoluteStep * position.stepTicks + position.offsetTicks;
  const absoluteStep =
    gridTicks === undefined
      ? position.absoluteStep
      : Math.round(exactTicks / gridTicks) * (gridTicks / position.stepTicks);
  const lap = Math.floor(absoluteStep / stepsPerLap);
  const stepInLap = absoluteStep - lap * stepsPerLap;

  return {
    pageIndex: Math.floor(stepInLap / props.stepsPerPage),
    stepIndex: stepInLap % props.stepsPerPage,
    lap,
    microtimeOffset:
      gridTicks === undefined
        ? microtimeOffsetForTicks(position.offsetTicks)
        : 0,
  };
}

// Ticks since the sequencer started, for the length of a held note.
export function positionTicks(position: StepSequencerPosition) {
  return position.absoluteStep * position.stepTicks + position.offsetTicks;
}

// `joinsPass` says another note already landed on this step during the same
// pass, so even replace mode keeps it: the notes form a chord.
export function recordLiveNote(
  runtimePatch: CompiledInstrumentEnginePatch,
  target: LiveRecordTarget,
  played: HeldNote,
  overdub: boolean,
  joinsPass: boolean,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const defaults = getStepDefaults(runtimePatch, props);
  const keep = overdub || joinsPass;

  return updateStepSequencerProps(runtimePatch, moduleId, {
    patterns: updateSteps(
      props,
      target.pageIndex,
      [target.stepIndex],
      (step): IStep => {
        const kept = keep
          ? step.notes.filter((note) => note.note !== played.note)
          : [];
        if (kept.length >= MAX_STEP_NOTES) {
          return step;
        }

        const wasEmpty = step.notes.length === 0;

        return {
          ...step,
          active: true,
          notes: [...kept, { note: played.note, velocity: played.velocity }],
          microtimeOffset:
            keep && !wasEmpty ? step.microtimeOffset : target.microtimeOffset,
          duration: wasEmpty ? defaults.duration : step.duration,
          probability: wasEmpty ? defaults.probability : step.probability,
        };
      },
    ),
  });
}

// The duration option nearest the held time, compared on a log scale so a
// short note is not rounded to a long option by a large absolute gap.
export function nearestDuration(heldTicks: number): IStep["duration"] {
  const options = stepPropSchema.duration.options as readonly Division[];
  const target = Math.log(Math.max(1, heldTicks));
  let best: Division = options[0] ?? "1/16";
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = Math.abs(Math.log(divisionToTicks(option)) - target);
    if (distance < bestDistance) {
      best = option;
      bestDistance = distance;
    }
  }

  return best;
}

export function setLiveNoteDuration(
  runtimePatch: CompiledInstrumentEnginePatch,
  target: LiveRecordTarget,
  heldTicks: number,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const duration = nearestDuration(heldTicks);
  const current =
    stepSequencer.props.patterns[stepSequencer.props.activePatternNo]?.pages[
      target.pageIndex
    ]?.steps[target.stepIndex];
  if (!current || current.duration === duration) {
    return null;
  }

  return updateStepSequencerProps(runtimePatch, stepSequencer.moduleId, {
    patterns: updateSteps(
      stepSequencer.props,
      target.pageIndex,
      [target.stepIndex],
      (step) => ({ ...step, duration }),
    ),
  });
}

// Erase as the playhead passes: the step loses its notes and turns off.
export function clearStep(
  runtimePatch: CompiledInstrumentEnginePatch,
  pageIndex: number,
  stepIndex: number,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const current =
    props.patterns[props.activePatternNo]?.pages[pageIndex]?.steps[stepIndex];
  if (!current || (!current.active && current.notes.length === 0)) {
    return null;
  }

  return updateStepSequencerProps(runtimePatch, moduleId, {
    patterns: updateSteps(props, pageIndex, [stepIndex], (step) => ({
      ...step,
      active: false,
      notes: [],
    })),
  });
}
