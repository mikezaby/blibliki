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

function createMacroInstrumentDocument(): InstrumentDocument {
  const document = createSeededInstrumentDocument();

  document.globalController = {
    ...document.globalController,
    macros: document.globalController.macros.map((macro, index) =>
      index === 0
        ? {
            ...macro,
            enabled: true,
            value: 0.5,
            mappings: [
              {
                moduleId: "track-1.filter.main",
                propKey: "cutoff",
                min: 1000,
                max: 5000,
                exp: 0,
              },
            ],
          }
        : macro,
    ),
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

  it("maps enabled macro movement to an offset delta on the target prop", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createInstrumentEnginePatch(
      createMacroInstrumentDocument(),
    );

    const result = surface.reduceEvent(
      runtimePatch,
      MidiEvent.fromCC(15, 65, 0),
    );

    const macro =
      result.runtimePatch.compiledInstrument.globalController.macros[0];
    expect(macro?.value).toBeCloseTo(0.51);
    if (result.command.type !== "macro") {
      throw new Error("Expected a macro command");
    }
    expect(result.command.cc).toBe(15);
    expect(result.command.adjustments).toHaveLength(1);
    const adjustment = result.command.adjustments[0]!;
    expect(adjustment.moduleId).toBe("track-1.filter.main");
    expect(adjustment.moduleType).toBe(ModuleType.Filter);
    expect(adjustment.propKey).toBe("cutoff");
    // Linear (exp 0) offset endpoints 1000..5000; a 0.01 step of a 5000 span.
    expect(adjustment.delta).toBeCloseTo(50);
    expect(adjustment.clampMin).toBe(20);
    expect(adjustment.clampMax).toBe(20000);
  });

  it("ignores disabled macro encoder movement", () => {
    const surface = new LaunchControlXL3Surface();
    const document = createMacroInstrumentDocument();
    document.globalController.macros[0] = {
      ...document.globalController.macros[0]!,
      enabled: false,
    };
    const runtimePatch = createInstrumentEnginePatch(document);

    const result = surface.reduceEvent(
      runtimePatch,
      MidiEvent.fromCC(15, 65, 0),
    );

    expect(result.command).toEqual({ type: "none" });
    expect(result.runtimePatch).toBe(runtimePatch);
  });
});
