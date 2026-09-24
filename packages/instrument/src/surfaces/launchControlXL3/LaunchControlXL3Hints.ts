import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  describeInstrumentHint,
  listInstrumentHints,
  type InstrumentHint,
  type InstrumentHintAction,
} from "@/display/hints";

// The gesture on a Launch Control XL3 for each action, spelled once for the
// screen and once in ASCII for a cell of the controller's own display. Knobs
// go by the label the screen gives them, so nobody has to count encoders.
const GESTURES: Record<
  InstrumentHintAction,
  { gesture: string; oled: string }
> = {
  enterStepEdit: { gesture: "[Shift] + [Page ▲]", oled: "S+Pg^ Edit" },
  leaveStepEdit: { gesture: "[Shift] + [Page ▲]", oled: "S+Pg^ Exit" },
  saveDraft: { gesture: "[Shift] + [Track ▶]", oled: "S+Tr> Save" },
  discardDraft: { gesture: "[Shift] + [Track ◀]", oled: "S+Tr< Undo" },
  switchTrack: { gesture: "[Track ◀] [Track ▶]", oled: "Tr<> Track" },
  switchPage: { gesture: "[Page ▲] [Page ▼]", oled: "Pg^v Page" },
  switchBar: { gesture: "[Page ▲] [Page ▼]", oled: "Pg^v Bar" },
  growLoop: { gesture: "Turn [Loop Length]", oled: "Loop Bars" },
  duplicateBar: { gesture: "[Shift] + [Page ▼]", oled: "S+Pgv Dup" },
  copyStep: {
    gesture: "[Shift] + tap [Step], then others",
    oled: "S+Step Copy",
  },
  fillBar: { gesture: "[Shift] + turn [Pulses] [Rotate]", oled: "S+E1,2 Fill" },
  octave: { gesture: "[Shift] + turn [Pitch]", oled: "S+Pitch Oct" },
  tapStep: { gesture: "Tap [Step]", oled: "Tap Toggle" },
  holdStep: { gesture: "Hold [Step], turn [Knob]", oled: "Hold Edit" },
  holdSeveral: {
    gesture: "Hold [Step] [Step], turn [Knob]",
    oled: "Hold+ Batch",
  },
  setDefaults: { gesture: "Turn [Knob], no step held", oled: "Turn Dflt" },
  editHeld: { gesture: "Turn [Knob]", oled: "Turn Edit" },
  releaseHeld: { gesture: "Let go of [Step]", oled: "Rel. Keep" },
  showCheatsheet: { gesture: "Hold [Shift]", oled: "Shift Help" },
};

export function createLaunchControlXL3Hints(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentHint[] {
  return listInstrumentHints(runtimePatch).map(({ action, group }) => ({
    action,
    group,
    ...GESTURES[action],
    ...describeInstrumentHint(action),
  }));
}
