import { type IMidiMapperProps, MidiEvent, ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import { reduceInstrumentControllerEvent } from "@/runtime/controllerRuntime";

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

describe("reduceInstrumentControllerEvent", () => {
  it("moves focus to the next track and syncs midi mapper activeTrack", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const result = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(102, 127, 0),
    );

    expect(result.command).toEqual({
      type: "navigation",
      action: "nextTrack",
    });
    expect(result.runtimePatch.runtime.navigation).toEqual({
      activeTrackIndex: 1,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    const midiMapper = result.runtimePatch.patch.modules.find(
      (module) => module.id === result.runtimePatch.runtime.midiMapperId,
    );
    if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;
    expect(midiMapperProps.activeTrack).toBe(1);
  });
});
