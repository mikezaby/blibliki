import { type IMidiMapperProps, ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { Instrument } from "@/Instrument";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentDocument } from "@/document/types";

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

describe("Instrument", () => {
  it("creates runtime and display state from a compiled runtime patch", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const instrument = Instrument.fromRuntimePatch(runtimePatch);

    expect(instrument.runtimeState.document).toEqual({
      version: "3",
      name: "Default Instrument",
      templateId: "default-performance-instrument",
      hardwareProfileId: "launchcontrolxl3-pi-lcd",
    });
    expect(instrument.runtimeState.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });
    expect(instrument.runtimeState.activeTrack.key).toBe("track-1");
    expect(instrument.runtimeState.activePage.pageKey).toBe("sourceAmp");
    expect(instrument.displayState.header.instrumentName).toBe(
      "Default Instrument",
    );
    expect(instrument.displayState.header.trackName).toBe("track-1");
    expect(instrument.displayState.header.pageKey).toBe("sourceAmp");
  });

  it("navigates immutably and syncs the serialized midi mapper focus", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const instrument = Instrument.fromRuntimePatch(runtimePatch);
    const nextInstrument = instrument.navigate("nextTrack");

    expect(instrument.runtimeState.navigation.activeTrackIndex).toBe(0);
    expect(nextInstrument.runtimeState.navigation.activeTrackIndex).toBe(1);

    const serializedPatch = nextInstrument.serializeEnginePatch();
    expect(serializedPatch.runtime.navigation.activeTrackIndex).toBe(1);

    const midiMapper = serializedPatch.patch.modules.find(
      (module) => module.id === serializedPatch.runtime.midiMapperId,
    );
    if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;
    expect(midiMapperProps.activeTrack).toBe(1);
  });

  it("applies partial navigation changes before serialization", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const instrument = Instrument.fromRuntimePatch(runtimePatch).withNavigation(
      {
        activeTrackIndex: -1,
        selectedStepIndex: 99,
      },
    );

    // Index -1 wraps to the master track (last), which falls back to filterMod.
    expect(instrument.runtimeState.navigation).toEqual({
      activeTrackIndex: 7,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 15,
    });
  });
});
