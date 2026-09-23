import { type IUpdateModule, MidiEvent, ModuleType } from "@blibliki/engine";
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
  duplicateBar,
  STEP_HOLD_MS,
  toggleStepEntry,
} from "@/sequencer/stepEntry";
import { applyLaunchControlXL3SequencerEncoderEvent } from "./LaunchControlXL3SequencerPatch";

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
      type: "macro";
      cc: number;
      adjustments: MacroPropAdjustment[];
    };

export type LaunchControlXL3Result = {
  runtimePatch: CompiledInstrumentEnginePatch;
  command: LaunchControlXL3Command;
};

const PLAY_CC = 116;
const RECORD_CC = 118;
const PAGE_UP_CC = 106;
const PAGE_DOWN_CC = 107;
const TRACK_PREV_CC = 103;
const TRACK_NEXT_CC = 102;
const SHIFT_CC = 63;
const STEP_BUTTON_CC_START = 37;
const STEP_BUTTON_CC_END = 52;
const ENCODER_CC_START = 13;
const ENCODER_CC_END = 36;

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
  const { heldSteps } = runtimePatch.runtime.navigation;

  if (isStepButton(cc)) {
    const stepIndex = cc - STEP_BUTTON_CC_START;

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
    const toggled = isTap ? toggleStepEntry(released, stepIndex) : null;

    return toggled
      ? {
          runtimePatch: toggled.runtimePatch,
          command: { type: "seqEdit.update", update: toggled.update },
        }
      : { runtimePatch: released, command: { type: "seqEdit.hold" } };
  }

  if (isEncoder(cc)) {
    const edit = applyLaunchControlXL3SequencerEncoderEvent(
      runtimePatch,
      cc,
      ccValue,
    );
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

export class LaunchControlXL3Surface {
  reduceEvent(
    runtimePatch: CompiledInstrumentEnginePatch,
    event: MidiEvent,
    now = performance.now(),
  ): LaunchControlXL3Result {
    if (!event.isCC || event.cc === undefined || event.ccValue === undefined) {
      return createNoopResult(runtimePatch);
    }

    if (event.cc === SHIFT_CC) {
      return {
        runtimePatch: updateInstrumentNavigation(runtimePatch, {
          shiftPressed: event.ccValue === 127,
        }),
        command: {
          type: "none",
        },
      };
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
      case PLAY_CC:
      case RECORD_CC:
      default:
        return createNoopResult(runtimePatch);
    }
  }
}

export const launchControlXL3Surface = new LaunchControlXL3Surface();
