import { ModuleType, type IStepSequencerProps } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createSavedInstrumentDocument } from "@/document/SavedInstrumentDocument";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("createSavedInstrumentDocument", () => {
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
