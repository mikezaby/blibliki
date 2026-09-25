import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import {
  describeInstrumentHint,
  listInstrumentHints,
  type InstrumentHint,
  type InstrumentHintAction,
} from "@/display/hints";

// The gesture on a Launch Control XL3 for each action, spelled once for the
// screen and once in ASCII for a cell of the controller's own display. Knobs
// go by their row, or by the label the screen gives them, so nobody has to
// count encoders.
const GESTURES: Record<
  InstrumentHintAction,
  { gesture: string; oled: string }
> = {
  switchTrack: { gesture: "[Track ◀] [Track ▶]", oled: "Tr<> Track" },
  switchPage: { gesture: "[Page ▲] [Page ▼]", oled: "Pg^v Page" },
  enterStepEdit: { gesture: "[Shift] + [Page ▲]", oled: "S+Pg^ Edit" },
  leaveStepEdit: { gesture: "[Shift] + [Page ▲]", oled: "S+Pg^ Exit" },
  saveDraft: { gesture: "[Shift] + [Track ▶] twice", oled: "S+Tr> Save" },
  discardDraft: { gesture: "[Shift] + [Track ◀] twice", oled: "S+Tr< Undo" },
  tapStep: { gesture: "Tap [Step]", oled: "Tap Toggle" },
  editNote: { gesture: "Hold [Step], turn [Bottom row]", oled: "Hold+R3 Note" },
  editVelocity: {
    gesture: "Hold [Step], turn [Middle row]",
    oled: "Hold+R2 Vel",
  },
  editSettings: { gesture: "Hold [Step], turn [Top row]", oled: "Hold+R1 Len" },
  switchBar: { gesture: "[Page ▲] [Page ▼]", oled: "Pg^v Bar" },
  copyStep: {
    gesture: "[Shift] + tap [Step], then others",
    oled: "S+Step Copy",
  },
  fillBar: { gesture: "[Shift] + turn [Pulses] [Rotate]", oled: "S+E1,2 Fill" },
  duplicateBar: { gesture: "[Shift] + [Page ▼]", oled: "S+Pgv Dup" },
  addChordNotes: {
    gesture: "Hold [Step], turn [Bottom row] 2 to 8",
    oled: "R3 2-8 Chord",
  },
  holdSeveral: { gesture: "Hold [Step] [Step]", oled: "Hold+ Batch" },
  playIntoStep: { gesture: "Hold [Step], play [Keys]", oled: "Hld+Key Note" },
  stampChord: { gesture: "Hold [Keys], tap [Step]", oled: "Keys+Tap Set" },
  playDefault: { gesture: "Play [Keys], then tap [Step]", oled: "Key Default" },
  setDefaults: { gesture: "Turn [Knob], no step held", oled: "Turn Dflt" },
  growLoop: { gesture: "Turn [Loop Length]", oled: "Loop Bars" },
  heldNote: { gesture: "Turn [Bottom row]", oled: "R3 Note" },
  heldVelocity: { gesture: "Turn [Middle row]", oled: "R2 Velocity" },
  heldSettings: { gesture: "Turn [Top row]", oled: "R1 Len/Prob" },
  heldPlay: { gesture: "Play [Keys]", oled: "Keys Note" },
  holdAnother: { gesture: "Hold another [Step]", oled: "Hold+ Step" },
  releaseHeld: { gesture: "Let go of [Step]", oled: "Rel. Done" },
  octave: { gesture: "[Shift] + turn [Bottom row]", oled: "S+R3 Octave" },
  showCheatsheet: {
    gesture: "Hold [Shift], or [?] on screen",
    oled: "Shift Help",
  },
};

export function createLaunchControlXL3Hints(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentHint[] {
  return listInstrumentHints(runtimePatch).map(({ action, group }) => ({
    action,
    group,
    ...GESTURES[action],
    text: describeInstrumentHint(action),
  }));
}
