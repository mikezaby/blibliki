import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";

// What the performer can do from where they are. The list is neutral; a
// surface attaches its own gesture names to each action.
export type InstrumentHintAction =
  | "enterStepEdit"
  | "leaveStepEdit"
  | "saveDraft"
  | "discardDraft"
  | "switchTrack"
  | "switchPage"
  | "switchBar"
  | "growLoop"
  | "duplicateBar"
  | "copyStep"
  | "fillBar"
  | "octave"
  | "tapStep"
  | "holdStep"
  | "holdSeveral"
  | "setDefaults"
  | "editHeld"
  | "releaseHeld"
  | "showCheatsheet";

export type InstrumentHint = {
  action: InstrumentHintAction;
  gesture: string;
  text: string;
  // At most 12 characters: one cell of the controller's screen.
  oled: string;
};

const HINT_TEXT: Record<InstrumentHintAction, string> = {
  enterStepEdit: "Enter Step Edit",
  leaveStepEdit: "Leave Step Edit",
  saveDraft: "Save the draft",
  discardDraft: "Discard the draft and reload the saved instrument",
  switchTrack: "Previous or next track",
  switchPage: "Previous or next page of controls",
  switchBar: "Previous or next bar",
  growLoop: "Add bars to the loop; a new bar copies the one before it",
  duplicateBar: "Copy this bar onto the next one and go there",
  copyStep: "Copy the first step tapped onto the ones tapped after it",
  fillBar: "Fill the bar with the default note: pulses, then rotate",
  octave: "Move the pitch an octave per tick",
  tapStep: "Toggle the step; a new one takes the defaults",
  holdStep: "Edit that step with the encoders",
  holdSeveral: "Edit the held steps together",
  setDefaults: "Set the defaults a new step inherits",
  editHeld: "Edit the held steps",
  releaseHeld: "Keep the edit; a quick tap would have toggled",
  showCheatsheet: "Show this list; on screen the ? key or button pins it",
};

export function describeInstrumentHint(action: InstrumentHintAction) {
  return HINT_TEXT[action];
}

export function listInstrumentHintActions(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentHintAction[] {
  const { navigation } = runtimePatch.runtime;
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[navigation.activeTrackIndex];
  const sequencerTrack = activeTrack?.noteSource === "stepSequencer";

  if (navigation.mode === "seqEdit") {
    if (navigation.heldSteps.length > 0) {
      return [
        "editHeld",
        "holdSeveral",
        "releaseHeld",
        "octave",
        "switchBar",
        "leaveStepEdit",
        "showCheatsheet",
      ];
    }

    return [
      "tapStep",
      "holdStep",
      "holdSeveral",
      "setDefaults",
      "switchBar",
      "growLoop",
      "duplicateBar",
      "copyStep",
      "fillBar",
      "leaveStepEdit",
      "saveDraft",
      "discardDraft",
      "showCheatsheet",
    ];
  }

  return [
    ...(sequencerTrack ? (["enterStepEdit"] as const) : []),
    "saveDraft",
    "discardDraft",
    "switchTrack",
    "switchPage",
    "showCheatsheet",
  ];
}
