import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import {
  createInstrumentRuntimeState,
  navigateInstrumentRuntime,
} from "@/runtime/instrumentRuntime";

function createSeededInstrumentDocument() {
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

describe("createInstrumentRuntimeState", () => {
  it("exposes document identity, active track, active page, and visible page metadata", () => {
    const runtime = createInstrumentRuntimeState(
      createInstrumentEnginePatch(createSeededInstrumentDocument()),
    );

    expect(runtime.document).toEqual({
      version: "1",
      name: "Default Instrument",
      templateId: "default-performance-instrument",
      hardwareProfileId: "launchcontrolxl3-pi-lcd",
    });

    expect(runtime.patch).toMatchObject({
      bpm: 120,
      timeSignature: [4, 4],
      transportState: "stopped",
      runtime: {
        masterId: "instrument.runtime.master",
        transportControlId: "instrument.runtime.transportControl",
        masterFilterId: "instrument.runtime.masterFilter",
        globalDelayId: "instrument.runtime.globalDelay",
        globalReverbId: "instrument.runtime.globalReverb",
        masterVolumeId: "instrument.runtime.masterVolume",
        midiMapperId: "instrument.runtime.midiMapper",
        noteInputId: "instrument.runtime.noteInput",
        controllerInputId: "instrument.runtime.controllerInput",
        controllerOutputId: "instrument.runtime.controllerOutput",
        navigation: {
          activeTrackIndex: 0,
          activePage: "sourceAmp",
          mode: "performance",
          shiftPressed: false,
          sequencerPageIndex: 0,
          selectedStepIndex: 0,
        },
        stepSequencerIds: {},
      },
    });

    expect(runtime.activeTrack).toEqual(
      expect.objectContaining({
        key: "track-1",
        name: "track-1",
        midiChannel: 1,
        noteSource: "externalMidi",
        sourceProfileId: "osc",
      }),
    );
    expect(runtime.activePage).toEqual({
      trackKey: "track-1",
      trackName: "track-1",
      midiChannel: 1,
      controllerPage: 1,
      trackIndex: 0,
      pageKey: "sourceAmp",
    });
    expect(runtime.visiblePage.pageKey).toBe("sourceAmp");
  });

  it("wraps track and page navigation while keeping midi mapper focus aligned to tracks", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const nextPage = navigateInstrumentRuntime(runtimePatch, "nextPage");
    expect(nextPage.runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    const wrappedTrack = navigateInstrumentRuntime(nextPage, "previousTrack");
    expect(wrappedTrack.runtime.navigation).toEqual({
      activeTrackIndex: 7,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    const wrappedPage = navigateInstrumentRuntime(wrappedTrack, "previousPage");
    expect(wrappedPage.runtime.navigation).toEqual({
      activeTrackIndex: 7,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });
  });
});
