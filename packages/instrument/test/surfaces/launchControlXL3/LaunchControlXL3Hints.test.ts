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

describe("createLaunchControlXL3Hints", () => {
  it("lists save, discard and Step Edit entry on a sequencer track in performance mode", () => {
    const hints = createLaunchControlXL3Hints(createPatch({}));

    expect(actionsOf(hints)).toEqual([
      "enterStepEdit",
      "saveDraft",
      "discardDraft",
      "switchTrack",
      "switchPage",
    ]);
    expect(hints[0]).toMatchObject({
      gesture: "Shift + Page ▲",
      text: "Enter Step Edit",
    });
    expect(hints.every((hint) => hint.oled.length <= 12)).toBe(true);
  });

  it("leaves Step Edit out on a track without a step sequencer", () => {
    const hints = createLaunchControlXL3Hints(createPatch({}, false));

    expect(actionsOf(hints)).not.toContain("enterStepEdit");
  });

  it("explains tap, hold and defaults in Step Edit with nothing held", () => {
    const hints = createLaunchControlXL3Hints(createPatch({ mode: "seqEdit" }));

    expect(actionsOf(hints)).toEqual([
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
    ]);
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
    ]);
  });
});
