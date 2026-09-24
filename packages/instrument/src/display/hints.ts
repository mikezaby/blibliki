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
  // Controls in brackets, as in "Hold [Step], turn [Knob]". The console
  // renders each one as a key and the words between them as plain text.
  gesture: string;
  // One short idea. A second one goes in `detail`.
  text: string;
  detail?: string;
  // At most 12 characters: one cell of the controller's screen.
  oled: string;
};

const HINT_TEXT: Record<
  InstrumentHintAction,
  { text: string; detail?: string }
> = {
  enterStepEdit: { text: "Enter Step Edit" },
  leaveStepEdit: { text: "Leave Step Edit" },
  saveDraft: {
    text: "Save the instrument",
    detail: "Press twice: the first press asks",
  },
  discardDraft: {
    text: "Discard changes",
    detail: "Reloads the saved instrument. Press twice.",
  },
  switchTrack: { text: "Previous or next track" },
  switchPage: { text: "Previous or next control page" },
  switchBar: { text: "Previous or next bar" },
  growLoop: {
    text: "Set how many bars loop",
    detail: "A new bar starts as a copy of the one before",
  },
  duplicateBar: {
    text: "Copy this bar to the next",
    detail: "Then moves there, so repeat it to fill the loop",
  },
  copyStep: {
    text: "Copy a step onto others",
    detail: "The first step tapped is the one copied",
  },
  fillBar: {
    text: "Fill the bar with a rhythm",
    detail: "Uses the default note. Written when you let go of Shift.",
  },
  octave: { text: "Move the pitch by octaves" },
  tapStep: {
    text: "Turn a step on or off",
    detail: "A new step gets the default note",
  },
  holdStep: { text: "Edit that step" },
  holdSeveral: { text: "Edit several steps together" },
  setDefaults: {
    text: "Set what new steps get",
    detail: "Note, velocity, length and probability",
  },
  editHeld: { text: "Edit the held steps" },
  releaseHeld: {
    text: "Finish the edit",
    detail: "A quick tap would toggle the step instead",
  },
  showCheatsheet: {
    text: "Show this list",
    detail: "On screen, the ? key or button keeps it open",
  },
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
