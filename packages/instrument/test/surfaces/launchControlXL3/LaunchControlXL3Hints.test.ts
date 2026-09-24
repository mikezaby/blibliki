import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import type { InstrumentNavigationState } from "@/compiler/instrumentTypes";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import { createLaunchControlXL3Hints } from "@/surfaces/launchControlXL3/LaunchControlXL3Hints";

function createPatch(
  navigation: Partial<InstrumentNavigationState>,
  sequencerTrack = true,
) {
  const document = createDefaultInstrumentDocument();
  document.tracks[0] = {
    ...document.tracks[0]!,
    sourceProfileId: "osc",
    noteSource: sequencerTrack ? "stepSequencer" : "externalMidi",
  };

  return createInstrumentEnginePatch(document, { navigation });
}

function actionsOf(hints: { action: string }[]) {
  return hints.map((hint) => hint.action);
}

function groupsOf(hints: { action: string; group: string }[]) {
  return Object.fromEntries(hints.map((hint) => [hint.action, hint.group]));
}

describe("createLaunchControlXL3Hints", () => {
  it("names a control in every gesture and keeps each description to one short idea", () => {
    const everyHint = [
      createLaunchControlXL3Hints(createPatch({})),
      createLaunchControlXL3Hints(createPatch({ mode: "seqEdit" })),
      createLaunchControlXL3Hints(
        createPatch({
          mode: "seqEdit",
          heldSteps: [{ stepIndex: 0, pressedAt: 0, edited: false }],
        }),
      ),
    ].flat();

    for (const hint of everyHint) {
      expect(hint.gesture, hint.action).toMatch(/\[[^\]]+\]/);
      expect(hint.text.length, hint.action).toBeLessThanOrEqual(30);
      expect(hint.text, hint.action).not.toContain(";");
    }
  });

  it("calls the fill knobs by the labels the screen gives them", () => {
    const hints = createLaunchControlXL3Hints(createPatch({ mode: "seqEdit" }));

    expect(hints.find((hint) => hint.action === "fillBar")).toMatchObject({
      gesture: "[Shift] + turn [Pulses] [Rotate]",
      text: "Fill the bar with a rhythm",
    });
  });

  it("lists save, discard and Step Edit entry on a sequencer track in performance mode", () => {
    const hints = createLaunchControlXL3Hints(createPatch({}));

    expect(actionsOf(hints)).toEqual([
      "enterStepEdit",
      "saveDraft",
      "discardDraft",
      "switchTrack",
      "switchPage",
      "showCheatsheet",
    ]);
    expect(hints[0]).toMatchObject({
      gesture: "[Shift] + [Page ▲]",
      text: "Enter Step Edit",
    });
    expect(hints.at(-1)).toMatchObject({
      gesture: "Hold [Shift]",
      text: "Show this list",
      detail: "On screen, the ? key or button keeps it open",
    });
    // Saving asks first, which the performer has to know to get it done.
    expect(hints[1]).toMatchObject({
      text: "Save the instrument",
      detail: "Press twice: the first press asks",
    });
    expect(groupsOf(hints)).toEqual({
      enterStepEdit: "Mode",
      saveDraft: "Save",
      discardDraft: "Save",
      switchTrack: "Navigate",
      switchPage: "Navigate",
      showCheatsheet: "Help",
    });
    expect(hints.every((hint) => hint.oled.length <= 12)).toBe(true);
  });

  it("leaves Step Edit out on a track without a step sequencer", () => {
    const hints = createLaunchControlXL3Hints(createPatch({}, false));

    expect(actionsOf(hints)).not.toContain("enterStepEdit");
  });

  it("explains tap, hold and defaults in Step Edit with nothing held", () => {
    const hints = createLaunchControlXL3Hints(createPatch({ mode: "seqEdit" }));

    // Grouped by context, in the order the groups read.
    expect(actionsOf(hints)).toEqual([
      "tapStep",
      "holdStep",
      "holdSeveral",
      "setDefaults",
      "copyStep",
      "fillBar",
      "switchBar",
      "growLoop",
      "duplicateBar",
      "leaveStepEdit",
      "saveDraft",
      "discardDraft",
      "showCheatsheet",
    ]);
    expect(groupsOf(hints)).toMatchObject({
      tapStep: "Steps",
      setDefaults: "Steps",
      copyStep: "Copy and fill",
      fillBar: "Copy and fill",
      switchBar: "Bars",
      duplicateBar: "Bars",
      leaveStepEdit: "Mode",
    });
  });

  it("narrows to the hold gestures while steps are held", () => {
    const hints = createLaunchControlXL3Hints(
      createPatch({
        mode: "seqEdit",
        heldSteps: [{ stepIndex: 2, pressedAt: 0, edited: false }],
      }),
    );

    expect(actionsOf(hints)).toEqual([
      "editHeld",
      "holdSeveral",
      "releaseHeld",
      "octave",
      "switchBar",
      "leaveStepEdit",
      "showCheatsheet",
    ]);
    // Holding more steps belongs with the held steps here, not with tapping.
    expect(groupsOf(hints)).toMatchObject({
      editHeld: "Held steps",
      holdSeveral: "Held steps",
      octave: "Held steps",
      switchBar: "Bars",
    });
  });
});
