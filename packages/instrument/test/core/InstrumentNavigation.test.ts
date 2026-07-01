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

// Keeps the required master track when reducing to a subset of note tracks.
function useNoteTracks(
  document: InstrumentDocument,
  noteTracks: InstrumentDocument["tracks"],
) {
  const master = document.tracks.find(
    (track) => track.audioSource?.type === "master",
  )!;
  document.tracks = [...noteTracks, master];
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

    // Index -1 wraps to the last track, which is the master track. It has no
    // sourceAmp page, so the page falls back to its first page (filterMod).
    expect(navigation.serialize()).toEqual({
      activeTrackIndex: 7,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: true,
      sequencerPageIndex: 1,
      selectedStepIndex: 15,
    });
    expect(navigation.activeTrack.key).toBe("master");
    expect(navigation.activePage.pageKey).toBe("filterMod");
    expect(navigation.visiblePage.pageKey).toBe("filterMod");
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

    // Wrapping backwards lands on the master track (last track), which keeps
    // filterMod since it exposes that page.
    const wrappedTrack = nextPage.navigate("previousTrack");
    expect(wrappedTrack.serialize()).toEqual({
      activeTrackIndex: 7,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    // The master track has only filterMod + fx, so previousPage wraps to fx.
    const wrappedPage = wrappedTrack.navigate("previousPage");
    expect(wrappedPage.serialize()).toEqual({
      activeTrackIndex: 7,
      activePage: "fx",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });
  });

  it("falls back to the first page available on a processing track", () => {
    const document = createSeededInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 2));
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };
    const runtimePatch = createInstrumentEnginePatch(document);

    const processingTrack =
      InstrumentNavigation.fromRuntimePatch(runtimePatch).navigate("nextTrack");

    expect(processingTrack.serialize()).toMatchObject({
      activeTrackIndex: 1,
      activePage: "filterMod",
    });
    expect(processingTrack.visiblePage.pageKey).toBe("filterMod");
    expect(processingTrack.navigate("nextPage").serialize()).toMatchObject({
      activePage: "fx",
    });
    expect(processingTrack.navigate("previousPage").serialize()).toMatchObject({
      activePage: "fx",
    });
  });

  it("normalizes the initial runtime page for a processing track", () => {
    const document = createSeededInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 2));
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };

    const runtimePatch = createInstrumentEnginePatch(document, {
      navigation: {
        activeTrackIndex: 1,
      },
    });

    expect(runtimePatch.runtime.navigation).toMatchObject({
      activeTrackIndex: 1,
      activePage: "filterMod",
    });
  });

  it("allows sequencer edit mode for processing-track CC automation", () => {
    const document = createSeededInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 2));
    document.tracks[1] = {
      ...document.tracks[1]!,
      noteSource: "stepSequencer",
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };

    const runtimePatch = createInstrumentEnginePatch(document, {
      navigation: {
        activeTrackIndex: 1,
        mode: "seqEdit",
      },
    });
    const navigation = InstrumentNavigation.fromRuntimePatch(runtimePatch);

    expect(runtimePatch.runtime.navigation.mode).toBe("seqEdit");
    expect(navigation.withChanges({ mode: "seqEdit" }).serialize().mode).toBe(
      "seqEdit",
    );
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
