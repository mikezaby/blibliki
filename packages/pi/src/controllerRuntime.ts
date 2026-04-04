import { MidiEvent } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@blibliki/instrument";
import {
  navigateInstrumentRuntime,
  type InstrumentNavigationAction,
  updateInstrumentRuntimeNavigation,
} from "@/instrumentRuntime";

type InstrumentControllerCommand =
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
      type: "seqEdit.step";
      stepIndex: number;
    }
  | {
      type: "persistence";
      action: "saveDraft" | "discardDraft";
    };

export type InstrumentControllerResult = {
  runtimePatch: CompiledInstrumentEnginePatch;
  command: InstrumentControllerCommand;
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

function createNoopResult(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentControllerResult {
  return {
    runtimePatch,
    command: {
      type: "none",
    },
  };
}

export function reduceInstrumentControllerEvent(
  runtimePatch: CompiledInstrumentEnginePatch,
  event: MidiEvent,
): InstrumentControllerResult {
  if (!event.isCC || event.cc === undefined || event.ccValue === undefined) {
    return createNoopResult(runtimePatch);
  }

  if (event.cc === SHIFT_CC) {
    return {
      runtimePatch: updateInstrumentRuntimeNavigation(runtimePatch, {
        shiftPressed: event.ccValue === 127,
      }),
      command: {
        type: "none",
      },
    };
  }

  if (event.ccValue !== 127) {
    return createNoopResult(runtimePatch);
  }

  const currentNavigation = runtimePatch.runtime.navigation;
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[currentNavigation.activeTrackIndex];
  const sequencerTrack = activeTrack?.noteSource === "stepSequencer";

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
      runtimePatch: updateInstrumentRuntimeNavigation(runtimePatch, {
        mode: enabled ? "seqEdit" : "performance",
      }),
      command: {
        type: "seqEdit.toggle",
        enabled,
      },
    };
  }

  if (currentNavigation.mode === "seqEdit" && sequencerTrack) {
    if (event.cc >= STEP_BUTTON_CC_START && event.cc <= STEP_BUTTON_CC_END) {
      const stepIndex = event.cc - STEP_BUTTON_CC_START;

      return {
        runtimePatch: updateInstrumentRuntimeNavigation(runtimePatch, {
          selectedStepIndex: stepIndex,
        }),
        command: {
          type: "seqEdit.step",
          stepIndex,
        },
      };
    }

    switch (event.cc) {
      case PAGE_UP_CC:
        return {
          runtimePatch: navigateInstrumentRuntime(runtimePatch, "nextPage"),
          command: {
            type: "seqEdit.page",
            action: "nextPage",
          },
        };
      case PAGE_DOWN_CC:
        return {
          runtimePatch: navigateInstrumentRuntime(runtimePatch, "previousPage"),
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
        runtimePatch: navigateInstrumentRuntime(runtimePatch, "nextTrack"),
        command: {
          type: "navigation",
          action: "nextTrack",
        },
      };
    case TRACK_PREV_CC:
      return {
        runtimePatch: navigateInstrumentRuntime(runtimePatch, "previousTrack"),
        command: {
          type: "navigation",
          action: "previousTrack",
        },
      };
    case PAGE_UP_CC:
      return {
        runtimePatch: navigateInstrumentRuntime(runtimePatch, "nextPage"),
        command: {
          type: "navigation",
          action: "nextPage",
        },
      };
    case PAGE_DOWN_CC:
      return {
        runtimePatch: navigateInstrumentRuntime(runtimePatch, "previousPage"),
        command: {
          type: "navigation",
          action: "previousPage",
        },
      };
    case PLAY_CC:
      return createNoopResult(runtimePatch);
    case RECORD_CC:
      return createNoopResult(runtimePatch);
    default:
      return createNoopResult(runtimePatch);
  }
}
