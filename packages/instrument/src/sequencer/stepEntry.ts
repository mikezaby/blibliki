import {
  type IPage,
  type IPattern,
  type IStep,
  type IStepSequencerProps,
  type IUpdateModule,
  ModuleType,
  PlaybackMode,
  Resolution,
  stepPropSchema,
} from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
  StepDefaults,
} from "@/compiler/instrumentTypes";
import {
  mapRelativeBoolean,
  mapRelativeEnum,
  mapRelativeNumber,
  mapRelativePitch,
  mapRelativeVelocity,
} from "./relativeValues";

// The hardware-neutral half of Step Edit: which steps are held, what a new
// step inherits, and how a relative control edits them. A surface maps its
// own buttons and encoders onto these calls.

export const DEFAULT_STEP_NOTE = "C3";
export const DEFAULT_STEP_VELOCITY = 100;
export const DEFAULT_STEP_DURATION: IStep["duration"] = "1/16";
export const STEP_HOLD_MS = 300;
export const STEPS_PER_PAGE = 16;
// The engine's loopLength schema stops at 16 (StepSequencer.ts), and the
// schema itself is not exported.
export const MAX_LOOP_LENGTH = 16;
export const DURATION_OPTIONS = stepPropSchema.duration.options;
export const RESOLUTION_OPTIONS = Object.values(Resolution);
export const PLAYBACK_OPTIONS = Object.values(PlaybackMode);

export type StepEntryControl =
  | { kind: "velocity" | "pitch"; slot: number }
  | {
      kind:
        | "active"
        | "probability"
        | "duration"
        | "microtime"
        | "resolution"
        | "playbackMode"
        | "loopLength";
    };

export type StepEntryUpdate = {
  runtimePatch: CompiledInstrumentEnginePatch;
  update?: IUpdateModule<ModuleType.StepSequencer>;
};

export type StepState = "off" | "programmed" | "held";

export type ActiveStepSequencer = {
  moduleId: string;
  props: IStepSequencerProps;
};

export function getActiveTrackKey(runtimePatch: CompiledInstrumentEnginePatch) {
  return runtimePatch.compiledInstrument.tracks[
    runtimePatch.runtime.navigation.activeTrackIndex
  ]?.key;
}

export function getActiveStepSequencerId(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const trackKey = getActiveTrackKey(runtimePatch);
  if (!trackKey) {
    return;
  }

  return runtimePatch.runtime.stepSequencerIds[trackKey];
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

export function getActivePage(
  props: IStepSequencerProps,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const pattern = props.patterns[props.activePatternNo] ?? props.patterns[0];
  const page =
    pattern?.pages[runtimePatch.runtime.navigation.sequencerPageIndex];

  return { pattern, page };
}

export function getHeldStepIndices(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  return runtimePatch.runtime.navigation.heldSteps.map(
    (held) => held.stepIndex,
  );
}

function findSeedStep(props: IStepSequencerProps): IStep | undefined {
  const pattern = props.patterns[props.activePatternNo] ?? props.patterns[0];

  for (const page of pattern?.pages ?? []) {
    const step = page.steps.find(
      (candidate) => candidate.active && candidate.notes.length > 0,
    );
    if (step) {
      return step;
    }
  }

  return undefined;
}

export function getStepDefaults(
  runtimePatch: CompiledInstrumentEnginePatch,
  props: IStepSequencerProps,
): StepDefaults {
  const seed = findSeedStep(props);
  const seedNote = seed?.notes[0];
  const trackKey = getActiveTrackKey(runtimePatch);

  return {
    note: seedNote?.note ?? DEFAULT_STEP_NOTE,
    velocity: seedNote?.velocity ?? DEFAULT_STEP_VELOCITY,
    duration: seed?.duration ?? DEFAULT_STEP_DURATION,
    probability: seed?.probability ?? 100,
    ...(trackKey
      ? runtimePatch.runtime.navigation.stepDefaults[trackKey]
      : undefined),
  };
}

export function withStepDefaults(
  runtimePatch: CompiledInstrumentEnginePatch,
  change: Partial<StepDefaults>,
): CompiledInstrumentEnginePatch {
  const trackKey = getActiveTrackKey(runtimePatch);
  if (!trackKey) {
    return runtimePatch;
  }

  const { navigation } = runtimePatch.runtime;

  return {
    ...runtimePatch,
    runtime: {
      ...runtimePatch.runtime,
      navigation: {
        ...navigation,
        stepDefaults: {
          ...navigation.stepDefaults,
          [trackKey]: {
            ...navigation.stepDefaults[trackKey],
            ...change,
          },
        },
      },
    },
  };
}

function updateStepSequencerProps(
  runtimePatch: CompiledInstrumentEnginePatch,
  moduleId: string,
  changes: Partial<IStepSequencerProps>,
): StepEntryUpdate {
  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module?.moduleType !== ModuleType.StepSequencer) {
    throw new Error("Active track is missing a step sequencer module");
  }

  const nextProps = {
    ...(module.props as IStepSequencerProps),
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

export function createStepEntryPageSync(
  runtimePatch: CompiledInstrumentEnginePatch,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  return updateStepSequencerProps(runtimePatch, stepSequencer.moduleId, {
    activePageNo: runtimePatch.runtime.navigation.sequencerPageIndex,
  });
}

function updateSteps(
  props: IStepSequencerProps,
  pageIndex: number,
  stepIndices: readonly number[],
  updater: (step: IStep) => IStep,
) {
  return props.patterns.map((pattern, patternIndex) => {
    if (patternIndex !== props.activePatternNo) {
      return pattern;
    }

    return {
      ...pattern,
      pages: pattern.pages.map((page, candidatePageIndex) => {
        if (candidatePageIndex !== pageIndex) {
          return page;
        }

        return {
          ...page,
          steps: page.steps.map((step, stepIndex) =>
            stepIndices.includes(stepIndex) ? updater(step) : step,
          ),
        };
      }),
    };
  });
}

function updateStepNoteSlot(
  step: IStep,
  noteIndex: number,
  change: { velocity: number } | { note: string | null },
  newNoteVelocity: number,
): IStep {
  const notes = [...step.notes];

  if ("velocity" in change) {
    const note = notes[noteIndex];
    if (!note) {
      return step;
    }

    notes[noteIndex] = { ...note, velocity: change.velocity };

    return { ...step, notes };
  }

  if (change.note === null) {
    if (!notes[noteIndex]) {
      return step;
    }

    notes.splice(noteIndex, 1);
  } else {
    const existingNote = notes[noteIndex];

    if (existingNote) {
      notes[noteIndex] = { ...existingNote, note: change.note };
    } else if (noteIndex === notes.length) {
      notes.push({ note: change.note, velocity: newNoteVelocity });
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

  return { ...step, active, notes };
}

// Off keeps the step's notes so a second tap brings them back. A step that
// never had any starts from the track defaults.
function toggleStep(step: IStep, defaults: StepDefaults): IStep {
  if (step.active) {
    return { ...step, active: false };
  }

  if (step.notes.length > 0 || step.ccMessages.length > 0) {
    return { ...step, active: true };
  }

  return {
    ...step,
    active: true,
    notes: [{ note: defaults.note, velocity: defaults.velocity }],
    duration: defaults.duration,
    probability: defaults.probability,
  };
}

export function toggleStepEntry(
  runtimePatch: CompiledInstrumentEnginePatch,
  stepIndex: number,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const defaults = getStepDefaults(runtimePatch, props);

  return updateStepSequencerProps(runtimePatch, moduleId, {
    patterns: updateSteps(
      props,
      runtimePatch.runtime.navigation.sequencerPageIndex,
      [stepIndex],
      (step) => toggleStep(step, defaults),
    ),
  });
}

function createStepUpdater(
  control: StepEntryControl,
  delta: number,
  defaults: StepDefaults,
): (step: IStep) => IStep {
  switch (control.kind) {
    case "velocity":
      return (step) => {
        const note = step.notes[control.slot];

        return note
          ? updateStepNoteSlot(
              step,
              control.slot,
              { velocity: mapRelativeVelocity(note.velocity, delta) },
              defaults.velocity,
            )
          : step;
      };
    case "pitch":
      return (step) =>
        updateStepNoteSlot(
          step,
          control.slot,
          {
            note: mapRelativePitch(
              step.notes[control.slot]?.note,
              delta,
              defaults.note,
            ),
          },
          defaults.velocity,
        );
    case "active":
      return (step) => ({
        ...step,
        active: mapRelativeBoolean(step.active, delta),
      });
    case "probability":
      return (step) => ({
        ...step,
        probability: mapRelativeNumber(step.probability, delta, 0, 100),
      });
    case "duration":
      return (step) => ({
        ...step,
        duration: mapRelativeEnum(
          step.duration,
          delta,
          DURATION_OPTIONS,
          DEFAULT_STEP_DURATION,
        ),
      });
    case "microtime":
      return (step) => ({
        ...step,
        microtimeOffset: mapRelativeNumber(
          step.microtimeOffset,
          delta,
          -100,
          100,
        ),
      });
    default:
      return (step) => step;
  }
}

function changeDefaults(
  control: StepEntryControl,
  delta: number,
  defaults: StepDefaults,
): Partial<StepDefaults> | null {
  switch (control.kind) {
    case "probability":
      return {
        probability: mapRelativeNumber(defaults.probability, delta, 0, 100),
      };
    case "duration":
      return {
        duration: mapRelativeEnum(
          defaults.duration,
          delta,
          DURATION_OPTIONS,
          DEFAULT_STEP_DURATION,
        ),
      };
    case "velocity":
      return control.slot === 0
        ? { velocity: mapRelativeVelocity(defaults.velocity, delta) }
        : null;
    case "pitch": {
      if (control.slot !== 0) {
        return null;
      }
      const note = mapRelativePitch(defaults.note, delta, defaults.note);

      return note ? { note } : null;
    }
    default:
      return null;
  }
}

// The value just set on the first held step becomes what new steps inherit.
function learnDefaults(
  control: StepEntryControl,
  step: IStep,
): Partial<StepDefaults> | null {
  switch (control.kind) {
    case "probability":
      return { probability: step.probability };
    case "duration":
      return { duration: step.duration };
    case "velocity":
    case "pitch": {
      const note = control.slot === 0 ? step.notes[0] : undefined;
      if (!note) {
        return null;
      }

      return control.kind === "velocity"
        ? { velocity: note.velocity }
        : { note: note.note };
    }
    default:
      return null;
  }
}

export function applyStepEntryControl(
  runtimePatch: CompiledInstrumentEnginePatch,
  control: StepEntryControl,
  delta: number,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer || delta === 0) {
    return null;
  }

  const { moduleId, props } = stepSequencer;

  switch (control.kind) {
    case "resolution":
      return updateStepSequencerProps(runtimePatch, moduleId, {
        resolution: mapRelativeEnum(
          props.resolution,
          delta,
          RESOLUTION_OPTIONS,
          Resolution.sixteenth,
        ),
      });
    case "playbackMode":
      return updateStepSequencerProps(runtimePatch, moduleId, {
        playbackMode: mapRelativeEnum(
          props.playbackMode,
          delta,
          PLAYBACK_OPTIONS,
          PlaybackMode.loop,
        ),
      });
    case "loopLength":
      return setLoopLength(
        runtimePatch,
        mapRelativeNumber(props.loopLength, delta, 1, MAX_LOOP_LENGTH),
      );
    default:
      break;
  }

  const defaults = getStepDefaults(runtimePatch, props);
  const heldSteps = getHeldStepIndices(runtimePatch);
  if (heldSteps.length === 0) {
    const change = changeDefaults(control, delta, defaults);

    return change
      ? { runtimePatch: withStepDefaults(runtimePatch, change) }
      : null;
  }

  const pageIndex = runtimePatch.runtime.navigation.sequencerPageIndex;
  const patterns = updateSteps(
    props,
    pageIndex,
    heldSteps,
    createStepUpdater(control, delta, defaults),
  );
  const edit = updateStepSequencerProps(runtimePatch, moduleId, { patterns });
  const firstHeld =
    patterns[props.activePatternNo]?.pages[pageIndex]?.steps[
      heldSteps[0] ?? -1
    ];
  const learned = firstHeld ? learnDefaults(control, firstHeld) : null;

  return learned
    ? { ...edit, runtimePatch: withStepDefaults(edit.runtimePatch, learned) }
    : edit;
}

function isEmptyPage(page: IPage) {
  return page.steps.every(
    (step) => step.notes.length === 0 && step.ccMessages.length === 0,
  );
}

function copyPage(page: IPage, name: string): IPage {
  return {
    name,
    steps: page.steps.map((step) => ({
      ...step,
      notes: step.notes.map((note) => ({ ...note })),
      ccMessages: step.ccMessages.map((message) => ({ ...message })),
    })),
  };
}

// Bars past the loop keep their steps, so shrinking and growing again brings
// them back. Only a bar that becomes active while empty is filled from the
// bar before it, which chains when the loop grows by several.
function growPattern(pattern: IPattern, from: number, to: number): IPattern {
  const pages = [...pattern.pages];

  for (let index = Math.max(from, 1); index < to; index += 1) {
    const previous = pages[index - 1];
    const page = pages[index];
    if (!previous) {
      break;
    }

    if (!page) {
      pages.push(copyPage(previous, `Page ${index + 1}`));
    } else if (isEmptyPage(page)) {
      pages[index] = copyPage(previous, page.name);
    }
  }

  return { ...pattern, pages };
}

export function setLoopLength(
  runtimePatch: CompiledInstrumentEnginePatch,
  loopLength: number,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const next = Math.max(1, Math.min(MAX_LOOP_LENGTH, loopLength));
  if (next === props.loopLength) {
    return null;
  }

  if (next < props.loopLength) {
    return updateStepSequencerProps(runtimePatch, moduleId, {
      loopLength: next,
    });
  }

  return updateStepSequencerProps(runtimePatch, moduleId, {
    patterns: props.patterns.map((pattern, index) =>
      index === props.activePatternNo
        ? growPattern(pattern, props.loopLength, next)
        : pattern,
    ),
    loopLength: next,
  });
}

// Copies the current bar onto the following one, growing the loop to reach
// it, and makes that bar the active page. The caller moves navigation there.
export function duplicateBar(
  runtimePatch: CompiledInstrumentEnginePatch,
): StepEntryUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const sourceIndex = runtimePatch.runtime.navigation.sequencerPageIndex;
  const targetIndex = sourceIndex + 1;
  const pattern = props.patterns[props.activePatternNo];
  const source = pattern?.pages[sourceIndex];
  if (!pattern || !source || targetIndex >= MAX_LOOP_LENGTH) {
    return null;
  }

  const pages = [...pattern.pages];
  pages[targetIndex] = copyPage(
    source,
    pages[targetIndex]?.name ?? `Page ${targetIndex + 1}`,
  );

  return updateStepSequencerProps(runtimePatch, moduleId, {
    patterns: props.patterns.map((candidate, index) =>
      index === props.activePatternNo ? { ...pattern, pages } : candidate,
    ),
    loopLength: Math.max(props.loopLength, targetIndex + 1),
    activePageNo: targetIndex,
  });
}

export function getStepStates(
  runtimePatch: CompiledInstrumentEnginePatch,
): StepState[] {
  const states: StepState[] = Array.from(
    { length: STEPS_PER_PAGE },
    () => "off",
  );
  if (runtimePatch.runtime.navigation.mode !== "seqEdit") {
    return states;
  }

  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return states;
  }

  const { page } = getActivePage(stepSequencer.props, runtimePatch);
  const heldSteps = new Set(getHeldStepIndices(runtimePatch));

  return states.map((_, stepIndex) => {
    if (heldSteps.has(stepIndex)) {
      return "held";
    }

    const step = page?.steps[stepIndex];
    if (!step?.active) {
      return "off";
    }

    return step.notes.length > 0 || step.ccMessages.length > 0
      ? "programmed"
      : "off";
  });
}
