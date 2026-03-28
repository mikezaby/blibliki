import {
  type IUpdateModule,
  MidiEvent,
  ModuleType,
  PlaybackMode,
  Resolution,
  TransportState,
  stepPropSchema,
  type IStepSequencerProps,
} from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
  InstrumentDisplayState,
} from "@blibliki/instrument";

const STEP_CONTROL_CCS = [13, 14, 15, 16, 17, 18, 19, 20] as const;
const VELOCITY_CCS = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const PITCH_CCS = [29, 30, 31, 32, 33, 34, 35, 36] as const;
const STEP_BUTTON_CCS = [
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
] as const;
const DURATION_OPTIONS = stepPropSchema.duration.options;
const RESOLUTION_OPTIONS = Object.values(Resolution);
const PLAYBACK_OPTIONS = Object.values(PlaybackMode);
const DEFAULT_NEW_NOTE_VELOCITY = 100;
const PITCH_MIN_MIDI = 24;
const PITCH_MAX_MIDI = 96;
const STEP_LED_OFF = 0;
const STEP_LED_PROGRAMMED = 64;
const STEP_LED_PLAYHEAD = 96;
const STEP_LED_SELECTED = 127;
const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

type StepSequencerPatchUpdate = {
  runtimePatch: CompiledInstrumentEnginePatch;
  update: IUpdateModule<ModuleType.StepSequencer>;
};

type StepLedSyncEngine = {
  findModule: (id: string) => {
    moduleType?: ModuleType;
    state?: {
      currentStep?: unknown;
    };
    onMidiEvent?: (event: MidiEvent) => unknown;
  };
};

function clampPercentFromCc(value: number) {
  return Math.max(0, Math.min(100, Math.round((value / 127) * 100)));
}

function mapCcToEnum<T extends string>(
  value: number,
  options: readonly T[],
  fallback: T,
) {
  const index = Math.max(
    0,
    Math.min(
      options.length - 1,
      Math.round((value / 127) * (options.length - 1)),
    ),
  );

  return options[index] ?? fallback;
}

function mapCcToMicrotime(value: number) {
  return Math.round((value / 127) * 200 - 100);
}

function mapCcToLoopLength(value: number) {
  return Math.max(1, Math.min(4, Math.round((value / 127) * 3) + 1));
}

function mapCcToVelocity(value: number) {
  return Math.max(0, Math.min(127, Math.round(value)));
}

function midiNumberToNoteName(midiNumber: number) {
  const noteName = NOTE_NAMES[midiNumber % 12] ?? NOTE_NAMES[0];
  const octave = Math.floor(midiNumber / 12) - 2;

  return `${noteName}${octave}`;
}

function mapCcToPitch(value: number) {
  if (value <= 0) {
    return null;
  }

  const midiNumber =
    PITCH_MIN_MIDI +
    Math.round(((value - 1) / 126) * (PITCH_MAX_MIDI - PITCH_MIN_MIDI));

  return midiNumberToNoteName(midiNumber);
}

function getActiveStepSequencerId(runtimePatch: CompiledInstrumentEnginePatch) {
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[
      runtimePatch.runtime.navigation.activeTrackIndex
    ];
  if (!activeTrack) {
    return;
  }

  return runtimePatch.runtime.stepSequencerIds[activeTrack.key];
}

function getStepSequencerProps(
  runtimePatch: CompiledInstrumentEnginePatch,
): { moduleId: string; props: IStepSequencerProps } | null {
  const moduleId = getActiveStepSequencerId(runtimePatch);
  if (!moduleId) {
    return null;
  }

  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (!module || module.moduleType !== ModuleType.StepSequencer) {
    return null;
  }

  return {
    moduleId,
    props: module.props as IStepSequencerProps,
  };
}

function getActiveStep(
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
): StepSequencerPatchUpdate {
  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (!module || module.moduleType !== ModuleType.StepSequencer) {
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
  updater: (
    step: NonNullable<ReturnType<typeof getActiveStep>["step"]>,
  ) => NonNullable<ReturnType<typeof getActiveStep>["step"]>,
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
  step: NonNullable<ReturnType<typeof getActiveStep>["step"]>,
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

function createBandSlot(
  cc: number,
  slotKey: string,
  label: string,
  shortLabel: string,
  valueText: string,
  inactive = false,
) {
  return {
    kind: "slot" as const,
    blockKey: "sequencer",
    slotKey,
    label,
    shortLabel,
    cc,
    inactive,
    valueText,
  };
}

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

export function syncSeqEditStepButtonLeds(
  engine: StepLedSyncEngine,
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

export function createSeqEditDisplayState(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentDisplayState | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[
      runtimePatch.runtime.navigation.activeTrackIndex
    ];
  if (!stepSequencer || !activeTrack) {
    return null;
  }

  const { props } = stepSequencer;
  const { step } = getActiveStep(props, runtimePatch);
  const notes = step?.notes ?? [];

  return {
    header: {
      instrumentName: runtimePatch.compiledInstrument.name,
      trackName: activeTrack.name,
      pageKey: runtimePatch.runtime.navigation.activePage,
      controllerPage: 1,
      midiChannel: activeTrack.midiChannel,
      transportState: TransportState.stopped,
      mode: "seqEdit",
    },
    globalBand: {
      slots: [
        {
          key: "active",
          label: "Active",
          shortLabel: "ACT",
          cc: STEP_CONTROL_CCS[0],
          valueText: step?.active ? "ON" : "OFF",
        },
        {
          key: "probability",
          label: "Probability",
          shortLabel: "PROB",
          cc: STEP_CONTROL_CCS[1],
          valueText: `${step?.probability ?? 100}%`,
        },
        {
          key: "duration",
          label: "Duration",
          shortLabel: "DUR",
          cc: STEP_CONTROL_CCS[2],
          valueText: step?.duration ?? DURATION_OPTIONS[0] ?? "1/16",
        },
        {
          key: "microtime",
          label: "Microtime",
          shortLabel: "MICR",
          cc: STEP_CONTROL_CCS[3],
          valueText: `${step?.microtimeOffset ?? 0}`,
        },
        {
          key: "resolution",
          label: "Resolution",
          shortLabel: "RES",
          cc: STEP_CONTROL_CCS[4],
          valueText: props.resolution,
        },
        {
          key: "playbackMode",
          label: "Playback Mode",
          shortLabel: "MODE",
          cc: STEP_CONTROL_CCS[5],
          valueText: props.playbackMode,
        },
        {
          key: "inactive",
          label: "Inactive",
          shortLabel: "---",
          cc: STEP_CONTROL_CCS[6],
          inactive: true,
          valueText: "--",
        },
        {
          key: "loopLength",
          label: "Loop Length",
          shortLabel: "LOOP",
          cc: STEP_CONTROL_CCS[7],
          valueText: `${props.loopLength}`,
        },
      ] as InstrumentDisplayState["globalBand"]["slots"],
    },
    upperBand: {
      position: "top",
      title: "VELOCITY",
      slots: VELOCITY_CCS.map((cc, index) =>
        createBandSlot(
          cc,
          `velocity-${index + 1}`,
          `Velocity ${index + 1}`,
          `VEL${index + 1}`,
          notes[index] ? `${notes[index].velocity}` : "--",
          !notes[index],
        ),
      ) as InstrumentDisplayState["upperBand"]["slots"],
    },
    lowerBand: {
      position: "bottom",
      title: "PITCH",
      slots: PITCH_CCS.map((cc, index) =>
        createBandSlot(
          cc,
          `pitch-${index + 1}`,
          `Pitch ${index + 1}`,
          `N${index + 1}`,
          notes[index]?.note ?? "--",
          !notes[index],
        ),
      ) as InstrumentDisplayState["lowerBand"]["slots"],
    },
  };
}

export function createSeqEditPageSync(
  runtimePatch: CompiledInstrumentEnginePatch,
): StepSequencerPatchUpdate | null {
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

export function applySeqEditEncoderEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  ccValue: number,
): StepSequencerPatchUpdate | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  if (!stepSequencer) {
    return null;
  }

  const { moduleId, props } = stepSequencer;
  const velocityIndex = VELOCITY_CCS.indexOf(
    cc as (typeof VELOCITY_CCS)[number],
  );
  if (velocityIndex >= 0) {
    return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
      patterns: updateActiveStep(props, runtimePatch, (step) =>
        updateStepNoteSlot(step, velocityIndex, {
          velocity: mapCcToVelocity(ccValue),
        }),
      ),
    });
  }

  const pitchIndex = PITCH_CCS.indexOf(cc as (typeof PITCH_CCS)[number]);
  if (pitchIndex >= 0) {
    return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
      patterns: updateActiveStep(props, runtimePatch, (step) =>
        updateStepNoteSlot(step, pitchIndex, {
          note: mapCcToPitch(ccValue),
        }),
      ),
    });
  }

  switch (cc) {
    case STEP_CONTROL_CCS[0]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          active: ccValue >= 64,
        })),
      });
    case STEP_CONTROL_CCS[1]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          probability: clampPercentFromCc(ccValue),
        })),
      });
    case STEP_CONTROL_CCS[2]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          duration: mapCcToEnum(
            ccValue,
            DURATION_OPTIONS,
            DURATION_OPTIONS[0] ?? "1/16",
          ),
        })),
      });
    case STEP_CONTROL_CCS[3]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        patterns: updateActiveStep(props, runtimePatch, (step) => ({
          ...step,
          microtimeOffset: mapCcToMicrotime(ccValue),
        })),
      });
    case STEP_CONTROL_CCS[4]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        resolution: mapCcToEnum(
          ccValue,
          RESOLUTION_OPTIONS,
          Resolution.sixteenth,
        ),
      });
    case STEP_CONTROL_CCS[5]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        playbackMode: mapCcToEnum(ccValue, PLAYBACK_OPTIONS, PlaybackMode.loop),
      });
    case STEP_CONTROL_CCS[7]:
      return updateRuntimePatchStepSequencerProps(runtimePatch, moduleId, {
        loopLength: mapCcToLoopLength(ccValue),
      });
    default:
      return null;
  }
}
