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
  | "tapStep"
  | "holdStep"
  | "holdSeveral"
  | "setDefaults"
  | "editHeld"
  | "releaseHeld";

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
  tapStep: "Toggle the step; a new one takes the defaults",
  holdStep: "Edit that step with the encoders",
  holdSeveral: "Edit the held steps together",
  setDefaults: "Set the defaults a new step inherits",
  editHeld: "Edit the held steps",
  releaseHeld: "Keep the edit; a quick tap would have toggled",
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
        "switchBar",
        "leaveStepEdit",
      ];
    }

    return [
      "tapStep",
      "holdStep",
      "holdSeveral",
      "setDefaults",
      "switchBar",
      "leaveStepEdit",
      "saveDraft",
      "discardDraft",
    ];
  }

  return [
    ...(sequencerTrack ? (["enterStepEdit"] as const) : []),
    "saveDraft",
    "discardDraft",
    "switchTrack",
    "switchPage",
  ];
}
