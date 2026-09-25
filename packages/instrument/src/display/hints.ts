import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";

// What the performer can do from where they are. The list is neutral; a
// surface attaches its own gesture names to each action.
export type InstrumentHintAction =
  | "switchTrack"
  | "switchPage"
  | "enterStepEdit"
  | "leaveStepEdit"
  | "saveDraft"
  | "discardDraft"
  | "tapStep"
  | "editNote"
  | "editVelocity"
  | "editSettings"
  | "switchBar"
  | "copyStep"
  | "fillBar"
  | "duplicateBar"
  | "addChordNotes"
  | "holdSeveral"
  | "playIntoStep"
  | "stampChord"
  | "playDefault"
  | "setDefaults"
  | "growLoop"
  | "heldNote"
  | "heldVelocity"
  | "heldSettings"
  | "heldPlay"
  | "holdAnother"
  | "releaseHeld"
  | "octave"
  | "showCheatsheet";

// How the cheatsheet sorts its entries: in Step Edit a path to follow first,
// then everything else by context.
export type InstrumentHintGroup =
  | "Write a pattern"
  | "Steps"
  | "Held steps"
  | "Copy and fill"
  | "Bars"
  | "Navigate"
  | "Mode"
  | "Save"
  | "Help";

// Steps to follow in order, which the console numbers.
export const STEP_BY_STEP_GROUPS: ReadonlySet<InstrumentHintGroup> = new Set([
  "Write a pattern",
]);

export type InstrumentHintEntry = {
  action: InstrumentHintAction;
  group: InstrumentHintGroup;
};

export type InstrumentHint = InstrumentHintEntry & {
  // Controls in brackets, as in "Hold [Step], turn [Bottom row]". The console
  // renders each one as a key and the words between them as plain text.
  gesture: string;
  // One short idea.
  text: string;
  // At most 12 characters: one cell of the controller's screen.
  oled: string;
};

const HINT_TEXT: Record<InstrumentHintAction, string> = {
  switchTrack: "Previous or next track",
  switchPage: "Previous or next control page",
  enterStepEdit: "Enter Step Edit",
  leaveStepEdit: "Leave Step Edit",
  saveDraft: "Save the instrument",
  discardDraft: "Discard your changes",
  tapStep: "Turn a step on or off",
  editNote: "Set its note",
  editVelocity: "Set its velocity",
  editSettings: "Set length, chance, timing",
  switchBar: "Next or previous bar",
  copyStep: "Copy it onto the others",
  fillBar: "Fill the bar with a rhythm",
  duplicateBar: "Copy this bar to the next",
  addChordNotes: "Add notes to make a chord",
  holdSeveral: "Edit several steps at once",
  playIntoStep: "Play its note or chord",
  stampChord: "Put the held chord on it",
  playDefault: "Played note becomes default",
  setDefaults: "Set what new steps get",
  growLoop: "Set how many bars loop",
  heldNote: "Set the note",
  heldVelocity: "Set the velocity",
  heldSettings: "Set length, chance, timing",
  heldPlay: "Play its note or chord",
  holdAnother: "Edit that one too",
  releaseHeld: "Finish the edit",
  octave: "Move the note by octaves",
  showCheatsheet: "Show or pin this list",
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
          "heldNote",
          "heldVelocity",
          "heldSettings",
          "heldPlay",
          "octave",
          "holdAnother",
          "releaseHeld",
        ]),
        ...entries("Help", ["showCheatsheet"]),
      ];
    }

    return [
      ...entries("Write a pattern", [
        "tapStep",
        "editNote",
        "editVelocity",
        "editSettings",
        "switchBar",
      ]),
      ...entries("Steps", [
        "holdSeveral",
        "addChordNotes",
        "playIntoStep",
        "stampChord",
        "playDefault",
        "setDefaults",
      ]),
      ...entries("Copy and fill", ["copyStep", "fillBar"]),
      ...entries("Bars", ["growLoop", "duplicateBar"]),
      ...entries("Mode", ["leaveStepEdit"]),
      ...entries("Save", ["saveDraft", "discardDraft"]),
      ...entries("Help", ["showCheatsheet"]),
    ];
  }

  return [
    ...entries("Navigate", ["switchTrack", "switchPage"]),
    ...entries("Mode", sequencerTrack ? ["enterStepEdit"] : []),
    ...entries("Save", ["saveDraft", "discardDraft"]),
    ...entries("Help", ["showCheatsheet"]),
  ];
}
