import { type IMidiMapperProps, MidiEvent, ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentDocument } from "@/document/types";
import { LaunchControlXL3Surface } from "@/surfaces/launchControlXL3/LaunchControlXL3Surface";

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

describe("LaunchControlXL3Surface", () => {
  it("maps track navigation controls to instrument navigation", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const result = surface.reduceEvent(
      runtimePatch,
      MidiEvent.fromCC(102, 127, 0),
    );

    expect(result.command).toEqual({
      type: "navigation",
      action: "nextTrack",
    });
    expect(result.runtimePatch.runtime.navigation.activeTrackIndex).toBe(1);

    const midiMapper = result.runtimePatch.patch.modules.find(
      (module) => module.id === result.runtimePatch.runtime.midiMapperId,
    );
    if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    expect((midiMapper.props as IMidiMapperProps).activeTrack).toBe(1);
  });

  it("maps shifted track controls to persistence commands", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const shifted = surface.reduceEvent(
      runtimePatch,
      MidiEvent.fromCC(63, 127, 0),
    );
    const result = surface.reduceEvent(
      shifted.runtimePatch,
      MidiEvent.fromCC(102, 127, 0),
    );

    expect(shifted.runtimePatch.runtime.navigation.shiftPressed).toBe(true);
    expect(result.command).toEqual({
      type: "persistence",
      action: "saveDraft",
    });
  });

  it("maps seq edit step buttons to selected step changes", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createInstrumentEnginePatch(
      createStepSequencerInstrumentDocument(),
    );

    const shifted = surface.reduceEvent(
      runtimePatch,
      MidiEvent.fromCC(63, 127, 0),
    );
    const seqEdit = surface.reduceEvent(
      shifted.runtimePatch,
      MidiEvent.fromCC(106, 127, 0),
    );
    const result = surface.reduceEvent(
      seqEdit.runtimePatch,
      MidiEvent.fromCC(40, 127, 0),
    );

    expect(seqEdit.command).toEqual({
      type: "seqEdit.toggle",
      enabled: true,
    });
    expect(result.command).toEqual({
      type: "seqEdit.step",
      stepIndex: 3,
    });
    expect(result.runtimePatch.runtime.navigation.selectedStepIndex).toBe(3);
  });
});
