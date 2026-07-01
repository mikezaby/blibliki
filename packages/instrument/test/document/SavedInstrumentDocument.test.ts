import { ModuleType, type IStepSequencerProps } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createSavedInstrumentDocument } from "@/document/SavedInstrumentDocument";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("createSavedInstrumentDocument", () => {
  it("saves master volume in dB", () => {
    const document = createDefaultInstrumentDocument();
    const runtimePatch = createInstrumentEnginePatch(document);
    const patch = structuredClone(runtimePatch.patch);
    const masterVolume = patch.modules.find(
      (module) => module.id === "master.trackGain.main",
    );

    if (!masterVolume) {
      throw new Error("Expected master volume module");
    }

    masterVolume.props = { volume: -18 };

    const saved = createSavedInstrumentDocument(document, runtimePatch, patch);

    expect(saved.globalBlock.masterVolume).toBe(-18);
    expect(saved.version).toBe("3");
  });

  it("migrates version 1 master volume when the runtime module is unavailable", () => {
    const document = createDefaultInstrumentDocument();
    document.version = "1";
    document.globalBlock.masterVolume = 0.5;
    const runtimePatch = createInstrumentEnginePatch(document);
    const patch = structuredClone(runtimePatch.patch);
    patch.modules = patch.modules.filter(
      (module) => module.id !== "master.trackGain.main",
    );

    const saved = createSavedInstrumentDocument(document, runtimePatch, patch);

    expect(saved.globalBlock.masterVolume).toBeCloseTo(-6.02, 2);
    expect(saved.version).toBe("3");
  });

  it("writes normalized audio sources for enabled and disabled tracks", () => {
    const document = createDefaultInstrumentDocument();
    delete document.tracks[0]!.audioSource;
    document.tracks[1] = {
      ...document.tracks[1]!,
      enabled: false,
      audioSource: undefined,
    };
    const runtimePatch = createInstrumentEnginePatch(document);

    const saved = createSavedInstrumentDocument(
      document,
      runtimePatch,
      structuredClone(runtimePatch.patch),
    );

    expect(saved.tracks[0]?.audioSource).toEqual({ type: "internal" });
    expect(saved.tracks[1]?.audioSource).toEqual({ type: "internal" });
  });

  it("preserves dormant source controls while saving a processing track", () => {
    const document = createDefaultInstrumentDocument();
    const master = document.tracks.find(
      (track) => track.audioSource?.type === "master",
    )!;
    document.tracks = [...document.tracks.slice(0, 2), master];
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
      controllerSlotValues: {
        "source.wave": "square",
        "amp.attack": 0.25,
        "filter.cutoff": 3200,
      },
    };
    const runtimePatch = createInstrumentEnginePatch(document);

    const saved = createSavedInstrumentDocument(
      document,
      runtimePatch,
      structuredClone(runtimePatch.patch),
    );

    expect(saved.tracks[1]?.controllerSlotValues).toMatchObject({
      "source.wave": "square",
      "amp.attack": 0.25,
      "filter.cutoff": 3200,
    });
  });

  it("preserves valid sequencer CC messages from the runtime patch", () => {
    const document = createDefaultInstrumentDocument();
    document.tracks[0] = {
      ...document.tracks[0]!,
      noteSource: "stepSequencer",
    };
    const runtimePatch = createInstrumentEnginePatch(document);
    const patch = structuredClone(runtimePatch.patch);
    const sequencer = patch.modules.find(
      (module) =>
        module.id === "track-1.runtime.stepSequencer" &&
        module.moduleType === ModuleType.StepSequencer,
    );

    if (!sequencer) {
      throw new Error("Expected track step sequencer");
    }

    const props = sequencer.props as IStepSequencerProps;
    props.patterns[0]!.pages[0]!.steps[0]!.ccMessages = [{ cc: 1, value: 64 }];

    const saved = createSavedInstrumentDocument(document, runtimePatch, patch);

    expect(saved.tracks[0]?.sequencer.pages[0]?.steps[0]?.ccMessages).toEqual([
      { cc: 1, value: 64 },
    ]);
  });
});
