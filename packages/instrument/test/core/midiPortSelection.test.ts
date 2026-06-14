import { describe, expect, it } from "vitest";
import type { MidiPortSelection } from "@/compiler/types";
import {
  excludeControllerFromAllNoteInputs,
  normalizePortSelection,
} from "@/core/midiPortSelection";

describe("MIDI port selection helpers", () => {
  it("preserves disabled port selections", () => {
    expect(normalizePortSelection(false, { selectedName: "fallback" })).toBe(
      false,
    );
  });

  it("fills missing port selection fields from defaults", () => {
    expect(
      normalizePortSelection(
        { selectedName: "User Device" },
        {
          selectedId: "default-id",
          selectedName: "Default Device",
          allIns: true,
          excludedIds: ["computer_keyboard"],
          excludedNames: ["Ignore Me"],
        },
      ),
    ).toEqual({
      selectedId: "default-id",
      selectedName: "User Device",
      allIns: true,
      excludedIds: ["computer_keyboard"],
      excludedNames: ["Ignore Me"],
    });
  });

  it("excludes the selected controller from all note inputs", () => {
    const noteInput: MidiPortSelection = {
      selectedId: null,
      selectedName: "All ins",
      allIns: true,
      excludedIds: ["computer_keyboard"],
      excludedNames: [],
    };
    const controllerInput: MidiPortSelection = {
      selectedId: "controller-id",
      selectedName: "LCXL3 DAW In",
      allIns: false,
      excludedIds: [],
      excludedNames: [],
    };

    expect(
      excludeControllerFromAllNoteInputs(noteInput, controllerInput),
    ).toEqual({
      selectedId: null,
      selectedName: "All ins",
      allIns: true,
      excludedIds: ["computer_keyboard", "controller-id"],
      excludedNames: ["LCXL3 DAW In"],
    });
  });

  it("does not change direct note input selections", () => {
    const noteInput: MidiPortSelection = {
      selectedId: "note-id",
      selectedName: "Keyboard",
      allIns: false,
      excludedIds: [],
      excludedNames: [],
    };

    expect(
      excludeControllerFromAllNoteInputs(noteInput, {
        selectedName: "LCXL3 DAW In",
      }),
    ).toEqual(noteInput);
  });
});
