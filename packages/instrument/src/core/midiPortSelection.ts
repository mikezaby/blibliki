export type MidiPortSelection = {
  selectedId?: string | null;
  selectedName?: string | null;
  allIns?: boolean;
  excludedIds?: string[];
  excludedNames?: string[];
};

export const DEFAULT_NOTE_INPUT: MidiPortSelection = {
  selectedId: null,
  selectedName: "All ins",
  allIns: true,
  excludedIds: ["computer_keyboard"],
  excludedNames: [],
};

export const DEFAULT_CONTROLLER_INPUT: MidiPortSelection = {
  selectedId: null,
  selectedName: "LCXL3 DAW In",
  allIns: false,
  excludedIds: [],
  excludedNames: [],
};

export const DEFAULT_CONTROLLER_OUTPUT: MidiPortSelection = {
  selectedId: null,
  selectedName: "LCXL3 DAW Out",
  allIns: false,
  excludedIds: [],
  excludedNames: [],
};

export function normalizePortSelection(
  selection: MidiPortSelection | false | undefined,
  defaults: MidiPortSelection,
): MidiPortSelection | false {
  if (selection === false) {
    return false;
  }

  return {
    selectedId: selection?.selectedId ?? defaults.selectedId ?? null,
    selectedName: selection?.selectedName ?? defaults.selectedName ?? null,
    allIns: selection?.allIns ?? defaults.allIns ?? false,
    excludedIds: selection?.excludedIds ?? defaults.excludedIds ?? [],
    excludedNames: selection?.excludedNames ?? defaults.excludedNames ?? [],
  };
}

export function excludeControllerFromAllNoteInputs(
  noteInputSelection: MidiPortSelection | false,
  controllerInputSelection: MidiPortSelection | false,
): MidiPortSelection | false {
  if (noteInputSelection === false || controllerInputSelection === false) {
    return noteInputSelection;
  }

  if (!noteInputSelection.allIns) {
    return noteInputSelection;
  }

  return {
    ...noteInputSelection,
    excludedIds: Array.from(
      new Set([
        ...(noteInputSelection.excludedIds ?? []),
        ...(controllerInputSelection.selectedId
          ? [controllerInputSelection.selectedId]
          : []),
      ]),
    ),
    excludedNames: Array.from(
      new Set([
        ...(noteInputSelection.excludedNames ?? []),
        ...(controllerInputSelection.selectedName
          ? [controllerInputSelection.selectedName]
          : []),
      ]),
    ),
  };
}
