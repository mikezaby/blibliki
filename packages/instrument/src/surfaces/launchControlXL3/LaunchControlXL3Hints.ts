import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  describeInstrumentHint,
  listInstrumentHintActions,
  type InstrumentHint,
  type InstrumentHintAction,
} from "@/display/hints";

// The gesture on a Launch Control XL3 for each action, spelled once for the
// screen and once in ASCII for a cell of the controller's own display.
const GESTURES: Record<
  InstrumentHintAction,
  { gesture: string; oled: string }
> = {
  enterStepEdit: { gesture: "Shift + Page ▲", oled: "S+Pg^ Edit" },
  leaveStepEdit: { gesture: "Shift + Page ▲", oled: "S+Pg^ Exit" },
  saveDraft: { gesture: "Shift + Track ▶", oled: "S+Tr> Save" },
  discardDraft: { gesture: "Shift + Track ◀", oled: "S+Tr< Undo" },
  switchTrack: { gesture: "Track ◀ ▶", oled: "Tr<> Track" },
  switchPage: { gesture: "Page ▲ ▼", oled: "Pg^v Page" },
  switchBar: { gesture: "Page ▲ ▼", oled: "Pg^v Bar" },
  growLoop: { gesture: "Turn Loop Length", oled: "Loop Bars" },
  duplicateBar: { gesture: "Shift + Page ▼", oled: "S+Pgv Dup" },
  tapStep: { gesture: "Tap a step", oled: "Tap Toggle" },
  holdStep: { gesture: "Hold a step + turn", oled: "Hold Edit" },
  holdSeveral: { gesture: "Hold more steps", oled: "Hold+ Batch" },
  setDefaults: { gesture: "Turn, nothing held", oled: "Turn Dflt" },
  editHeld: { gesture: "Turn an encoder", oled: "Turn Edit" },
  releaseHeld: { gesture: "Release", oled: "Rel. Keep" },
};

export function createLaunchControlXL3Hints(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentHint[] {
  return listInstrumentHintActions(runtimePatch).map((action) => ({
    action,
    ...GESTURES[action],
    text: describeInstrumentHint(action),
  }));
}
