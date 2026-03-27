import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import {
  createInstrumentRuntimeState,
  navigateInstrumentRuntime,
} from "@/instrumentRuntime";

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

    expect(runtime.patch).toEqual({
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
    expect(runtime.globalBlock).toEqual({
      tempo: 120,
      swing: 0,
      masterFilterCutoff: 20000,
      masterFilterResonance: 1,
      reverbSend: 0,
      delaySend: 0,
      masterVolume: 1,
    });

    expect(runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
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
    expect(runtime.visiblePage.controllerPage).toBe(1);
    expect(runtime.visiblePage.regions[0].position).toBe("top");
    const topFirstSlot = runtime.visiblePage.regions[0].slots[0];
    if (topFirstSlot.kind !== "slot") {
      throw new Error("Expected top first slot to be populated");
    }
    expect(topFirstSlot.label).toBe("Wave");
    expect(topFirstSlot.shortLabel).toBe("WAVE");
    expect(topFirstSlot.binding).toEqual({
      kind: "module-prop",
      moduleId: "track-1.source.main",
      moduleType: "Oscillator",
      propKey: "wave",
    });

    expect(runtime.visiblePage.regions[1].position).toBe("bottom");
    const bottomFirstSlot = runtime.visiblePage.regions[1].slots[0];
    if (bottomFirstSlot.kind !== "slot") {
      throw new Error("Expected bottom first slot to be populated");
    }
    expect(bottomFirstSlot.label).toBe("Attack");
    expect(bottomFirstSlot.shortLabel).toBe("A");
    expect(bottomFirstSlot.binding).toEqual({
      kind: "module-prop",
      moduleId: "track-1.amp.envelope",
      moduleType: "Envelope",
      propKey: "attack",
    });
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
    expect(createInstrumentRuntimeState(nextPage).activePage).toEqual({
      trackKey: "track-1",
      trackName: "track-1",
      midiChannel: 1,
      controllerPage: 2,
      trackIndex: 0,
      pageKey: "filterMod",
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

    const wrappedTrackState = createInstrumentRuntimeState(wrappedTrack);
    expect(wrappedTrackState.activeTrack.key).toBe("track-8");
    expect(wrappedTrackState.activePage.pageKey).toBe("filterMod");
    expect(wrappedTrackState.activePage.trackIndex).toBe(7);

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
