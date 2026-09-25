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

const held = [{ stepIndex: 2, pressedAt: 0, edited: false }];

function outline(hints: { action: string; group: string }[]) {
  return hints.map((hint) => `${hint.group}: ${hint.action}`);
}

describe("createLaunchControlXL3Hints", () => {
  it("names a control in every gesture and keeps each description to one short idea", () => {
    const everyHint = [
      createLaunchControlXL3Hints(createPatch({})),
      createLaunchControlXL3Hints(createPatch({ mode: "seqEdit" })),
      createLaunchControlXL3Hints(
        createPatch({ mode: "seqEdit", heldSteps: held }),
      ),
      createLaunchControlXL3Hints(
        createPatch({
          mode: "seqEdit",
          stepRecord: { cursor: 0, written: false },
        }),
      ),
    ].flat();

    for (const hint of everyHint) {
      expect(hint.gesture, hint.action).toMatch(/\[[^\]]+\]/);
      expect(hint.text.length, hint.action).toBeLessThanOrEqual(30);
      expect(hint.text, hint.action).not.toContain(";");
      expect(hint.oled.length, hint.action).toBeLessThanOrEqual(12);
    }
  });

  it("in performance mode groups the gestures by context", () => {
    const hints = createLaunchControlXL3Hints(createPatch({}));

    expect(outline(hints)).toEqual([
      "Navigate: switchTrack",
      "Navigate: switchPage",
      "Mode: enterStepEdit",
      "Save: saveDraft",
      "Save: discardDraft",
      "Help: showCheatsheet",
    ]);
    expect(hints[2]).toMatchObject({
      gesture: "[Shift] + [Page ▲]",
      text: "Enter Step Edit",
    });
    // Saving asks first, which the performer has to know to get it done.
    expect(hints[3]).toMatchObject({
      gesture: "[Shift] + [Track ▶] twice",
      text: "Save the instrument",
    });
  });

  it("leaves Step Edit out on a track without a step sequencer", () => {
    const hints = createLaunchControlXL3Hints(createPatch({}, false));

    expect(hints.map((hint) => hint.action)).not.toContain("enterStepEdit");
  });

  it("in Step Edit starts with how to write a pattern, then groups the rest by context", () => {
    const hints = createLaunchControlXL3Hints(createPatch({ mode: "seqEdit" }));

    expect(outline(hints)).toEqual([
      "Write a pattern: tapStep",
      "Write a pattern: editNote",
      "Write a pattern: editVelocity",
      "Write a pattern: editSettings",
      "Write a pattern: switchBar",
      "Steps: holdSeveral",
      "Steps: addChordNotes",
      "Steps: playIntoStep",
      "Steps: stampChord",
      "Steps: playDefault",
      "Steps: setDefaults",
      "Copy and fill: copyStep",
      "Copy and fill: fillBar",
      "Bars: growLoop",
      "Bars: duplicateBar",
      "Mode: enterStepRecord",
      "Mode: leaveStepEdit",
      "Save: saveDraft",
      "Save: discardDraft",
      "Help: showCheatsheet",
    ]);
    expect(hints.slice(1, 4).map((hint) => [hint.gesture, hint.text])).toEqual([
      ["Hold [Step], turn [Bottom row]", "Set its note"],
      ["Hold [Step], turn [Middle row]", "Set its velocity"],
      ["Hold [Step], turn [Top row]", "Set length, chance, timing"],
    ]);
    expect(hints.find((hint) => hint.action === "fillBar")).toMatchObject({
      gesture: "[Shift] + turn [Pulses] [Rotate]",
      text: "Fill the bar with a rhythm",
    });
  });

  it("while steps are held says what each knob row does to them", () => {
    const hints = createLaunchControlXL3Hints(
      createPatch({ mode: "seqEdit", heldSteps: held }),
    );

    expect(outline(hints)).toEqual([
      "Held steps: heldNote",
      "Held steps: heldVelocity",
      "Held steps: heldSettings",
      "Held steps: heldPlay",
      "Held steps: octave",
      "Held steps: holdAnother",
      "Held steps: releaseHeld",
      "Help: showCheatsheet",
    ]);
  });

  it("in step record lists how the cursor moves and how to leave", () => {
    const hints = createLaunchControlXL3Hints(
      createPatch({
        mode: "seqEdit",
        stepRecord: { cursor: 3, written: false },
      }),
    );

    expect(outline(hints)).toEqual([
      "Step record: recordNote",
      "Step record: recordRest",
      "Step record: recordBack",
      "Step record: recordCursor",
      "Mode: leaveStepRecord",
      "Help: showCheatsheet",
    ]);
    expect(hints[4]).toMatchObject({
      gesture: "[Shift] + [Record]",
      text: "Leave step record",
    });
  });
});
