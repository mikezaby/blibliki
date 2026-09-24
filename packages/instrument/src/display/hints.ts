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

// Where the performer is when a gesture matters, which is how the cheatsheet
// sorts its entries.
export type InstrumentHintGroup =
  | "Steps"
  | "Held steps"
  | "Copy and fill"
  | "Bars"
  | "Mode"
  | "Navigate"
  | "Save"
  | "Help";

export type InstrumentHintEntry = {
  action: InstrumentHintAction;
  group: InstrumentHintGroup;
};

export type InstrumentHint = InstrumentHintEntry & {
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

function entries(
  group: InstrumentHintGroup,
  actions: InstrumentHintAction[],
): InstrumentHintEntry[] {
  return actions.map((action) => ({ action, group }));
}

// The order here is the order the cheatsheet reads: groups first to last,
// then gestures within a group.
export function listInstrumentHints(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentHintEntry[] {
  const { navigation } = runtimePatch.runtime;
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[navigation.activeTrackIndex];
  const sequencerTrack = activeTrack?.noteSource === "stepSequencer";

  if (navigation.mode === "seqEdit") {
    if (navigation.heldSteps.length > 0) {
      return [
        ...entries("Held steps", [
          "editHeld",
          "holdSeveral",
          "releaseHeld",
          "octave",
        ]),
        ...entries("Bars", ["switchBar"]),
        ...entries("Mode", ["leaveStepEdit"]),
        ...entries("Help", ["showCheatsheet"]),
      ];
    }

    return [
      ...entries("Steps", [
        "tapStep",
        "holdStep",
        "holdSeveral",
        "setDefaults",
      ]),
      ...entries("Copy and fill", ["copyStep", "fillBar"]),
      ...entries("Bars", ["switchBar", "growLoop", "duplicateBar"]),
      ...entries("Mode", ["leaveStepEdit"]),
      ...entries("Save", ["saveDraft", "discardDraft"]),
      ...entries("Help", ["showCheatsheet"]),
    ];
  }

  return [
    ...entries("Mode", sequencerTrack ? ["enterStepEdit"] : []),
    ...entries("Save", ["saveDraft", "discardDraft"]),
    ...entries("Navigate", ["switchTrack", "switchPage"]),
    ...entries("Help", ["showCheatsheet"]),
  ];
}
