import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { InstrumentNavigation } from "@/core/InstrumentNavigation";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentDocument } from "@/document/types";
import type { TrackPageKey } from "@/types";

function createSeededInstrumentDocument(): InstrumentDocument {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
  };

  return document;
}

function createStepSequencerInstrumentDocument(): InstrumentDocument {
  const document = createSeededInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    noteSource: "stepSequencer",
  };

  return document;
}

describe("InstrumentNavigation", () => {
  it("normalizes track, page, mode, sequencer page, and selected step invariants", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const navigation = InstrumentNavigation.fromRuntimePatch(
      runtimePatch,
    ).withChanges({
      activeTrackIndex: -1,
      activePage: "missing" as TrackPageKey,
      mode: "seqEdit",
      shiftPressed: true,
      sequencerPageIndex: 5,
      selectedStepIndex: 99,
    });

    expect(navigation.serialize()).toEqual({
      activeTrackIndex: 7,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: true,
      sequencerPageIndex: 1,
      selectedStepIndex: 15,
    });
    expect(navigation.activeTrack.key).toBe("track-8");
    expect(navigation.activePage.pageKey).toBe("sourceAmp");
    expect(navigation.visiblePage.pageKey).toBe("sourceAmp");
  });

  it("navigates tracks and pages in performance mode", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const navigation = InstrumentNavigation.fromRuntimePatch(runtimePatch);

    const nextPage = navigation.navigate("nextPage");
    expect(nextPage.serialize()).toEqual({
      activeTrackIndex: 0,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    const wrappedTrack = nextPage.navigate("previousTrack");
    expect(wrappedTrack.serialize()).toEqual({
      activeTrackIndex: 7,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    const wrappedPage = wrappedTrack.navigate("previousPage");
    expect(wrappedPage.serialize()).toEqual({
      activeTrackIndex: 7,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });
  });

  it("keeps seq edit page navigation scoped to sequencer pages", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createStepSequencerInstrumentDocument(),
    );

    const navigation = InstrumentNavigation.fromRuntimePatch(
      runtimePatch,
    ).withChanges({
      mode: "seqEdit",
      sequencerPageIndex: 3,
    });

    expect(navigation.serialize()).toMatchObject({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "seqEdit",
      sequencerPageIndex: 3,
    });

    expect(navigation.navigate("nextPage").serialize()).toMatchObject({
      activePage: "sourceAmp",
      mode: "seqEdit",
      sequencerPageIndex: 0,
    });
    expect(navigation.navigate("previousPage").serialize()).toMatchObject({
      activePage: "sourceAmp",
      mode: "seqEdit",
      sequencerPageIndex: 2,
    });
    expect(navigation.navigate("previousTrack").serialize()).toMatchObject({
      activeTrackIndex: 7,
      mode: "performance",
      sequencerPageIndex: 3,
    });
  });
});
