import { type IMidiMapperProps, MidiEvent, ModuleType } from "@blibliki/engine";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { reduceInstrumentControllerEvent } from "@/controllerRuntime";

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

  it("moves to the next page and swaps the focused track mappings", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const result = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(106, 127, 0),
    );

    expect(result.command).toEqual({
      type: "navigation",
      action: "nextPage",
    });
    expect(result.runtimePatch.runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "filterMod",
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
    expect(midiMapperProps.tracks[0]?.mappings[0]).toEqual(
      expect.objectContaining({
        moduleId: "track-1.filter.main",
        propName: "cutoff",
      }),
    );
  });

  it("ignores play presses so transport control stays with the engine controller", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const pressed = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(116, 127, 0),
    );
    expect(pressed.command).toEqual({
      type: "none",
    });
    expect(pressed.runtimePatch).toBe(runtimePatch);

    const released = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(116, 0, 0),
    );
    expect(released.command).toEqual({
      type: "none",
    });
    expect(released.runtimePatch).toBe(runtimePatch);
  });

  it("ignores record presses so play remains the only transport toggle button", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const pressed = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(118, 127, 0),
    );
    expect(pressed.command).toEqual({
      type: "none",
    });
    expect(pressed.runtimePatch).toBe(runtimePatch);

    const released = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(118, 0, 0),
    );
    expect(released.command).toEqual({
      type: "none",
    });
    expect(released.runtimePatch).toBe(runtimePatch);
  });

  it("enters seq edit with shift plus page next on sequencer tracks and repurposes page buttons and step buttons", () => {
    const document = createSeededInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      noteSource: "stepSequencer",
    };

    const runtimePatch = createInstrumentEnginePatch(document);
    const shifted = reduceInstrumentControllerEvent(
      runtimePatch,
      MidiEvent.fromCC(63, 127, 0),
    );
    const entered = reduceInstrumentControllerEvent(
      shifted.runtimePatch,
      MidiEvent.fromCC(106, 127, 0),
    );

    expect(entered.command).toEqual({
      type: "seqEdit.toggle",
      enabled: true,
    });
    expect(entered.runtimePatch.runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "seqEdit",
      shiftPressed: true,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });

    const shiftReleased = reduceInstrumentControllerEvent(
      entered.runtimePatch,
      MidiEvent.fromCC(63, 0, 0),
    );
    const nextSequencerPage = reduceInstrumentControllerEvent(
      shiftReleased.runtimePatch,
      MidiEvent.fromCC(106, 127, 0),
    );

    expect(nextSequencerPage.command).toEqual({
      type: "seqEdit.page",
      action: "nextPage",
    });
    expect(nextSequencerPage.runtimePatch.runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "seqEdit",
      shiftPressed: false,
      sequencerPageIndex: 1,
      selectedStepIndex: 0,
    });

    const selectedStep = reduceInstrumentControllerEvent(
      nextSequencerPage.runtimePatch,
      MidiEvent.fromCC(45, 127, 0),
    );

    expect(selectedStep.command).toEqual({
      type: "seqEdit.step",
      stepIndex: 8,
    });
    expect(selectedStep.runtimePatch.runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "seqEdit",
      shiftPressed: false,
      sequencerPageIndex: 1,
      selectedStepIndex: 8,
    });

    const previousSequencerPage = reduceInstrumentControllerEvent(
      selectedStep.runtimePatch,
      MidiEvent.fromCC(107, 127, 0),
    );

    expect(previousSequencerPage.command).toEqual({
      type: "seqEdit.page",
      action: "previousPage",
    });
    expect(previousSequencerPage.runtimePatch.runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "sourceAmp",
      mode: "seqEdit",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 8,
    });
  });
});
