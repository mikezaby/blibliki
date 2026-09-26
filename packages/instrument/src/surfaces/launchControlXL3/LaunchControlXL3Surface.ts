import {
  type IStepSequencerProps,
  type IUpdateModule,
  MidiEvent,
  MidiEventType,
  ModuleType,
} from "@blibliki/engine";
import { Instrument } from "@/Instrument";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type { InstrumentNavigationAction } from "@/core/InstrumentNavigation";
import { launchControlXL3GlobalRow } from "@/hardware/launchControlXL3/globalRow";
import {
  getMacroNumberSchema,
  macroOffsetDelta,
  reduceMacroValue,
} from "@/macros/macroMapping";
import type { MacroEncoder } from "@/macros/types";
import {
  applyFill,
  applyStepEntryControl,
  copyStep,
  countDefaultNoteSteps,
  duplicateBar,
  moveStepRecordCursor,
  playNoteIntoSteps,
  restStepRecord,
  stampChordOnStep,
  STEP_HOLD_MS,
  STEPS_PER_PAGE,
  toggleStepEntry,
  withStepDefaults,
  writeStepRecordNote,
} from "@/sequencer/stepEntry";
import {
  getRelativeDelta,
  STEP_CONTROL_CCS,
} from "./LaunchControlXL3SequencerControls";
import {
  applyLaunchControlXL3SequencerEncoderEvent,
  resolveLaunchControlXL3SequencerControl,
} from "./LaunchControlXL3SequencerPatch";

// A macro turn nudges each target's engine prop by `delta` (the change in the
// macro's offset), leaving the base — the target's dedicated encoder value —
// untouched. The session reads the live prop and clamps to the schema bounds.
export type MacroPropAdjustment = {
  moduleId: string;
  moduleType: ModuleType;
  propKey: string;
  delta: number;
  clampMin: number;
  clampMax: number;
};

type LaunchControlXL3Command =
  | {
      type: "none";
    }
  | {
      type: "navigation";
      action: InstrumentNavigationAction;
    }
  | {
      type: "seqEdit.toggle";
      enabled: boolean;
    }
  | {
      type: "seqEdit.page";
      action: "nextPage" | "previousPage";
    }
  | {
      type: "seqEdit.hold";
    }
  | {
      type: "seqEdit.update";
      update?: IUpdateModule<ModuleType.StepSequencer>;
      cc?: number;
    }
  | {
      type: "persistence";
      action: "saveDraft" | "discardDraft";
    }
  | {
      type: "liveRecord.toggle";
      enabled: boolean;
    }
  | {
      type: "macro";
      cc: number;
      adjustments: MacroPropAdjustment[];
    };

export type LaunchControlXL3Result = {
  runtimePatch: CompiledInstrumentEnginePatch;
  command: LaunchControlXL3Command;
};

const RECORD_CC = 118;
// The button the device labels Solo / Arm.
const ARM_CC = 65;
const PAGE_UP_CC = 106;
const PAGE_DOWN_CC = 107;
const TRACK_PREV_CC = 103;
const TRACK_NEXT_CC = 102;
const SHIFT_CC = 63;
const STEP_BUTTON_CC_START = 37;
const STEP_BUTTON_CC_END = 52;
const ENCODER_CC_START = 13;
const ENCODER_CC_END = 36;
const PULSES_CC = STEP_CONTROL_CCS[0];
const ROTATE_CC = STEP_CONTROL_CCS[1];
const SEMITONES_PER_OCTAVE = 12;

function createNoopResult(
  runtimePatch: CompiledInstrumentEnginePatch,
): LaunchControlXL3Result {
  return {
    runtimePatch,
    command: {
      type: "none",
    },
  };
}

function updateInstrumentNavigation(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: Partial<CompiledInstrumentEnginePatch["runtime"]["navigation"]>,
) {
  return Instrument.fromRuntimePatch(runtimePatch)
    .withNavigation(navigation)
    .serializeEnginePatch();
}

function navigateInstrument(
  runtimePatch: CompiledInstrumentEnginePatch,
  action: InstrumentNavigationAction,
) {
  return Instrument.fromRuntimePatch(runtimePatch)
    .navigate(action)
    .serializeEnginePatch();
}

function findMacroControl(cc: number) {
  return launchControlXL3GlobalRow.find(
    (control) => control.cc === cc && control.slotId,
  );
}

function findMacroForControl(
  runtimePatch: CompiledInstrumentEnginePatch,
  control: NonNullable<ReturnType<typeof findMacroControl>>,
) {
  const slotId = control.slotId;
  if (!slotId) {
    return;
  }

  const assignment =
    runtimePatch.compiledInstrument.globalController.encoderSlots[slotId];
  if (assignment?.type !== "macro") {
    return;
  }

  return runtimePatch.compiledInstrument.globalController.macros.find(
    (macro) => macro.id === assignment.macroId,
  );
}

function replaceMacro(
  runtimePatch: CompiledInstrumentEnginePatch,
  macro: MacroEncoder,
): CompiledInstrumentEnginePatch {
  return {
    ...runtimePatch,
    compiledInstrument: {
      ...runtimePatch.compiledInstrument,
      globalController: {
        ...runtimePatch.compiledInstrument.globalController,
        macros: runtimePatch.compiledInstrument.globalController.macros.map(
          (candidate) => (candidate.id === macro.id ? macro : candidate),
        ),
      },
    },
  };
}

function createMacroAdjustment(
  runtimePatch: CompiledInstrumentEnginePatch,
  mapping: MacroEncoder["mappings"][number],
  oldValue: number,
  newValue: number,
  polarity: MacroEncoder["polarity"],
): MacroPropAdjustment | undefined {
  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === mapping.moduleId,
  );
  if (!module) {
    return;
  }

  const propSchema = getMacroNumberSchema(module.moduleType, mapping.propKey);
  if (!propSchema) {
    return;
  }

  const delta = macroOffsetDelta(
    oldValue,
    newValue,
    mapping,
    polarity,
    propSchema.exp,
  );
  if (delta === 0) {
    return;
  }

  return {
    moduleId: mapping.moduleId,
    moduleType: module.moduleType,
    propKey: mapping.propKey,
    delta,
    clampMin: propSchema.min,
    clampMax: propSchema.max,
  };
}

function applyMacroEncoderEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  ccValue: number,
): LaunchControlXL3Result | undefined {
  if (runtimePatch.runtime.navigation.mode !== "performance") {
    return;
  }

  const control = findMacroControl(cc);
  if (!control) {
    return;
  }

  const macro = findMacroForControl(runtimePatch, control);
  if (!macro?.enabled) {
    return createNoopResult(runtimePatch);
  }

  const nextMacro = {
    ...macro,
    value: reduceMacroValue(macro.value, ccValue, macro.polarity),
  };
  const nextRuntimePatch = replaceMacro(runtimePatch, nextMacro);

  return {
    runtimePatch: nextRuntimePatch,
    command: {
      type: "macro",
      cc,
      adjustments: nextMacro.mappings.flatMap((mapping) => {
        const adjustment = createMacroAdjustment(
          nextRuntimePatch,
          mapping,
          macro.value,
          nextMacro.value,
          nextMacro.polarity,
        );

        return adjustment ? [adjustment] : [];
      }),
    },
  };
}

function isStepButton(cc: number) {
  return cc >= STEP_BUTTON_CC_START && cc <= STEP_BUTTON_CC_END;
}

// Two edits made in a row on the same sequencer, sent as one update.
function mergeSequencerUpdates(
  ...updates: (IUpdateModule<ModuleType.StepSequencer> | undefined)[]
): IUpdateModule<ModuleType.StepSequencer> | undefined {
  const present = updates.filter((update) => update !== undefined);
  const first = present[0];
  if (!first) {
    return undefined;
  }

  return {
    ...first,
    changes: {
      props: present.reduce<Partial<IStepSequencerProps>>(
        (merged, update) => ({ ...merged, ...update.changes.props }),
        {},
      ),
    },
  };
}

function stepRecordResult(
  runtimePatch: CompiledInstrumentEnginePatch,
  update: IUpdateModule<ModuleType.StepSequencer> | undefined,
): LaunchControlXL3Result {
  return {
    runtimePatch,
    command: update
      ? { type: "seqEdit.update", update }
      : { type: "seqEdit.hold" },
  };
}

function isEncoder(cc: number) {
  return cc >= ENCODER_CC_START && cc <= ENCODER_CC_END;
}

// Tap or hold is decided at release: a hold is any press that outlived
// STEP_HOLD_MS or saw an encoder move, and only a tap toggles the step.
function reduceStepEditEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  ccValue: number,
  now: number,
): LaunchControlXL3Result | undefined {
  const { heldSteps, shiftPressed, copySource, fill, stepRecord } =
    runtimePatch.runtime.navigation;

  if (isStepButton(cc)) {
    const stepIndex = cc - STEP_BUTTON_CC_START;

    // With Shift down the buttons copy: the first tap is the source, the
    // rest are pasted onto. Releases mean nothing here.
    if (shiftPressed) {
      if (ccValue !== 127) {
        return createNoopResult(runtimePatch);
      }

      if (copySource === undefined) {
        return {
          runtimePatch: updateInstrumentNavigation(runtimePatch, {
            copySource: stepIndex,
          }),
          command: { type: "seqEdit.hold" },
        };
      }

      const pasted = copyStep(runtimePatch, copySource, stepIndex);

      return pasted
        ? {
            runtimePatch: pasted.runtimePatch,
            command: { type: "seqEdit.update", update: pasted.update },
          }
        : createNoopResult(runtimePatch);
    }

    // In step record a step button only moves the cursor.
    if (stepRecord) {
      return ccValue === 127
        ? {
            runtimePatch: updateInstrumentNavigation(runtimePatch, {
              stepRecord: { cursor: stepIndex, written: false },
            }),
            command: { type: "seqEdit.hold" },
          }
        : createNoopResult(runtimePatch);
    }

    if (ccValue === 127) {
      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          heldSteps: [
            ...heldSteps.filter((held) => held.stepIndex !== stepIndex),
            { stepIndex, pressedAt: now, edited: false },
          ],
        }),
        command: { type: "seqEdit.hold" },
      };
    }

    if (ccValue !== 0) {
      return createNoopResult(runtimePatch);
    }

    const held = heldSteps.find(
      (candidate) => candidate.stepIndex === stepIndex,
    );
    if (!held) {
      return createNoopResult(runtimePatch);
    }

    const released = updateInstrumentNavigation(runtimePatch, {
      heldSteps: heldSteps.filter((candidate) => candidate !== held),
    });
    const isTap = !held.edited && now - held.pressedAt < STEP_HOLD_MS;
    // Keys down while a step is tapped stamp their chord onto it.
    const chord = runtimePatch.runtime.navigation.heldNotes;
    const tapped = !isTap
      ? null
      : chord?.length
        ? stampChordOnStep(released, stepIndex, chord)
        : toggleStepEntry(released, stepIndex);

    return tapped
      ? {
          runtimePatch: tapped.runtimePatch,
          command: { type: "seqEdit.update", update: tapped.update },
        }
      : { runtimePatch: released, command: { type: "seqEdit.hold" } };
  }

  if (isEncoder(cc)) {
    const delta = getRelativeDelta(ccValue);

    // Shift turns the first two encoders into the fill's pulses and rotate,
    // previewed on the LEDs until Shift's release writes it.
    if (shiftPressed && (cc === PULSES_CC || cc === ROTATE_CC)) {
      if (delta === 0) {
        return createNoopResult(runtimePatch);
      }

      const current = fill ?? {
        pulses: countDefaultNoteSteps(runtimePatch),
        rotate: 0,
      };
      const nextFill =
        cc === PULSES_CC
          ? {
              ...current,
              pulses: Math.max(
                0,
                Math.min(STEPS_PER_PAGE, current.pulses + delta),
              ),
            }
          : {
              ...current,
              rotate:
                (((current.rotate + delta) % STEPS_PER_PAGE) + STEPS_PER_PAGE) %
                STEPS_PER_PAGE,
            };

      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          fill: nextFill,
        }),
        command: { type: "seqEdit.update", cc },
      };
    }

    const control = resolveLaunchControlXL3SequencerControl(cc);
    const edit =
      shiftPressed && control?.kind === "pitch"
        ? applyStepEntryControl(
            runtimePatch,
            control,
            delta * SEMITONES_PER_OCTAVE,
          )
        : applyLaunchControlXL3SequencerEncoderEvent(runtimePatch, cc, ccValue);
    if (!edit) {
      return createNoopResult(runtimePatch);
    }

    const nextRuntimePatch = heldSteps.some((held) => !held.edited)
      ? updateInstrumentNavigation(edit.runtimePatch, {
          heldSteps: heldSteps.map((held) => ({ ...held, edited: true })),
        })
      : edit.runtimePatch;

    return {
      runtimePatch: nextRuntimePatch,
      command: { type: "seqEdit.update", update: edit.update, cc },
    };
  }

  return undefined;
}

// A note on the active track's channel, in Step Edit: it is played into the
// held steps, kept while the key is down so a tap can stamp it, and becomes
// the default note for new steps.
function reduceNoteEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  event: MidiEvent,
): LaunchControlXL3Result {
  const navigation = runtimePatch.runtime.navigation;
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[navigation.activeTrackIndex];
  const note = event.note;
  if (
    !note ||
    !activeTrack ||
    event.channel !== activeTrack.midiChannel - 1 ||
    navigation.mode !== "seqEdit" ||
    activeTrack.noteSource !== "stepSequencer"
  ) {
    return createNoopResult(runtimePatch);
  }

  const name = note.fullName;
  const velocity = Math.round(note.velocity * 127);
  const heldNotes = (navigation.heldNotes ?? []).filter(
    (held) => held.note !== name,
  );

  if (event.type !== MidiEventType.noteOn || velocity === 0) {
    const lifted = updateInstrumentNavigation(runtimePatch, { heldNotes });
    // Releasing the last key ends the chord and advances the cursor.
    const advance =
      heldNotes.length === 0 && navigation.stepRecord?.written
        ? moveStepRecordCursor(lifted, 1)
        : null;

    return advance
      ? stepRecordResult(advance.runtimePatch, advance.update)
      : { runtimePatch: lifted, command: { type: "none" } };
  }

  const played = { note: name, velocity };
  const { heldSteps, stepRecord } = navigation;

  if (stepRecord) {
    // A key pressed while others are down joins the chord at the cursor.
    const written = writeStepRecordNote(
      runtimePatch,
      played,
      heldNotes.length > 0,
    );

    return stepRecordResult(
      updateInstrumentNavigation(
        withStepDefaults(written?.runtimePatch ?? runtimePatch, {
          note: name,
        }),
        {
          heldNotes: [...heldNotes, played],
          stepRecord: { ...stepRecord, written: true },
        },
      ),
      written?.update,
    );
  }

  const edit = playNoteIntoSteps(
    runtimePatch,
    heldSteps.map((held) => ({
      stepIndex: held.stepIndex,
      replace: !held.played,
    })),
    played,
  );
  const nextRuntimePatch = updateInstrumentNavigation(
    withStepDefaults(edit?.runtimePatch ?? runtimePatch, { note: name }),
    {
      heldNotes: [...heldNotes, played],
      heldSteps: heldSteps.map((held) => ({
        ...held,
        edited: true,
        played: true,
      })),
    },
  );

  return {
    runtimePatch: nextRuntimePatch,
    command: edit
      ? { type: "seqEdit.update", update: edit.update }
      : { type: "none" },
  };
}

export class LaunchControlXL3Surface {
  reduceEvent(
    runtimePatch: CompiledInstrumentEnginePatch,
    event: MidiEvent,
    now = performance.now(),
  ): LaunchControlXL3Result {
    if (event.isNote) {
      return reduceNoteEvent(runtimePatch, event);
    }

    if (!event.isCC || event.cc === undefined || event.ccValue === undefined) {
      return createNoopResult(runtimePatch);
    }

    if (event.cc === SHIFT_CC) {
      const pressed = event.ccValue === 127;
      const { fill: heldFill, liveRecord } = runtimePatch.runtime.navigation;
      const fill = pressed ? undefined : heldFill;
      const nextRuntimePatch = updateInstrumentNavigation(runtimePatch, {
        shiftPressed: pressed,
        copySource: undefined,
        fill: undefined,
        liveRecord: liveRecord ? { erasing: false } : undefined,
      });
      // A fill previewed while Shift was down is written as it goes up.
      const written = fill ? applyFill(nextRuntimePatch, fill) : null;

      return written
        ? {
            runtimePatch: written.runtimePatch,
            command: { type: "seqEdit.update", update: written.update },
          }
        : { runtimePatch: nextRuntimePatch, command: { type: "none" } };
    }

    const macroResult = applyMacroEncoderEvent(
      runtimePatch,
      event.cc,
      event.ccValue,
    );
    if (macroResult) {
      return macroResult;
    }

    const currentNavigation = runtimePatch.runtime.navigation;
    const activeTrack =
      runtimePatch.compiledInstrument.tracks[
        currentNavigation.activeTrackIndex
      ];
    const sequencerTrack = activeTrack?.noteSource === "stepSequencer";

    // Letting go of Page Down ends the erase; Shift's release does too.
    if (
      event.cc === PAGE_DOWN_CC &&
      event.ccValue === 0 &&
      currentNavigation.liveRecord?.erasing
    ) {
      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          liveRecord: { erasing: false },
        }),
        command: { type: "none" },
      };
    }

    if (currentNavigation.mode === "seqEdit" && sequencerTrack) {
      const stepEditResult = reduceStepEditEvent(
        runtimePatch,
        event.cc,
        event.ccValue,
        now,
      );
      if (stepEditResult) {
        return stepEditResult;
      }
    }

    if (event.ccValue !== 127) {
      return createNoopResult(runtimePatch);
    }

    // Arm, in Step Edit, is step record. Step and real-time record never
    // run together.
    if (
      !currentNavigation.shiftPressed &&
      event.cc === ARM_CC &&
      currentNavigation.mode === "seqEdit" &&
      sequencerTrack
    ) {
      const armed = currentNavigation.stepRecord !== undefined;

      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          stepRecord: armed ? undefined : { cursor: 0, written: false },
          liveRecord: undefined,
        }),
        command: armed
          ? { type: "seqEdit.hold" }
          : { type: "liveRecord.toggle", enabled: false },
      };
    }

    // Record alone is the engine's WAV recording, so real-time record arms
    // on the shifted press, in either mode. Shift + Play was the first
    // choice, but the XL3 does not deliver Play while Shift is held.
    if (
      currentNavigation.shiftPressed &&
      event.cc === RECORD_CC &&
      sequencerTrack
    ) {
      const enabled = currentNavigation.liveRecord === undefined;

      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          liveRecord: enabled ? { erasing: false } : undefined,
          stepRecord: undefined,
        }),
        command: { type: "liveRecord.toggle", enabled },
      };
    }

    // While recording, holding Shift + Page Down erases what the playhead
    // passes. It outranks the bar copy that sits on the same combo.
    if (
      currentNavigation.shiftPressed &&
      event.cc === PAGE_DOWN_CC &&
      currentNavigation.liveRecord
    ) {
      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          liveRecord: { erasing: true },
        }),
        command: { type: "none" },
      };
    }

    if (currentNavigation.shiftPressed && event.cc === TRACK_NEXT_CC) {
      return {
        runtimePatch,
        command: {
          type: "persistence",
          action: "saveDraft",
        },
      };
    }

    if (currentNavigation.shiftPressed && event.cc === TRACK_PREV_CC) {
      return {
        runtimePatch,
        command: {
          type: "persistence",
          action: "discardDraft",
        },
      };
    }

    if (
      event.cc === PAGE_UP_CC &&
      currentNavigation.shiftPressed &&
      sequencerTrack
    ) {
      const enabled = currentNavigation.mode !== "seqEdit";

      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          mode: enabled ? "seqEdit" : "performance",
        }),
        command: {
          type: "seqEdit.toggle",
          enabled,
        },
      };
    }

    if (
      event.cc === PAGE_DOWN_CC &&
      currentNavigation.shiftPressed &&
      currentNavigation.mode === "seqEdit" &&
      sequencerTrack
    ) {
      const duplicated = duplicateBar(runtimePatch);
      if (!duplicated) {
        return createNoopResult(runtimePatch);
      }

      return {
        runtimePatch: updateInstrumentNavigation(duplicated.runtimePatch, {
          sequencerPageIndex: currentNavigation.sequencerPageIndex + 1,
        }),
        command: { type: "seqEdit.update", update: duplicated.update },
      };
    }

    if (currentNavigation.mode === "seqEdit" && sequencerTrack) {
      switch (event.cc) {
        // In step record the track buttons walk the cursor: right leaves a
        // rest and moves on, left goes back.
        case TRACK_NEXT_CC: {
          if (!currentNavigation.stepRecord) {
            break;
          }
          const rested = restStepRecord(runtimePatch);
          const moved = moveStepRecordCursor(
            rested?.runtimePatch ?? runtimePatch,
            1,
          );

          return stepRecordResult(
            moved?.runtimePatch ?? rested?.runtimePatch ?? runtimePatch,
            mergeSequencerUpdates(rested?.update, moved?.update),
          );
        }
        case TRACK_PREV_CC: {
          if (!currentNavigation.stepRecord) {
            break;
          }
          const moved = moveStepRecordCursor(runtimePatch, -1);

          return stepRecordResult(
            moved?.runtimePatch ?? runtimePatch,
            moved?.update,
          );
        }
        case PAGE_UP_CC:
          return {
            runtimePatch: navigateInstrument(runtimePatch, "nextPage"),
            command: {
              type: "seqEdit.page",
              action: "nextPage",
            },
          };
        case PAGE_DOWN_CC:
          return {
            runtimePatch: navigateInstrument(runtimePatch, "previousPage"),
            command: {
              type: "seqEdit.page",
              action: "previousPage",
            },
          };
        default:
          break;
      }
    }

    switch (event.cc) {
      case TRACK_NEXT_CC:
        return {
          runtimePatch: navigateInstrument(runtimePatch, "nextTrack"),
          command: {
            type: "navigation",
            action: "nextTrack",
          },
        };
      case TRACK_PREV_CC:
        return {
          runtimePatch: navigateInstrument(runtimePatch, "previousTrack"),
          command: {
            type: "navigation",
            action: "previousTrack",
          },
        };
      case PAGE_UP_CC:
        return {
          runtimePatch: navigateInstrument(runtimePatch, "nextPage"),
          command: {
            type: "navigation",
            action: "nextPage",
          },
        };
      case PAGE_DOWN_CC:
        return {
          runtimePatch: navigateInstrument(runtimePatch, "previousPage"),
          command: {
            type: "navigation",
            action: "previousPage",
          },
        };
      case RECORD_CC:
      default:
        return createNoopResult(runtimePatch);
    }
  }
}

export const launchControlXL3Surface = new LaunchControlXL3Surface();
