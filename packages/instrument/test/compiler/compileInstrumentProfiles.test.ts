import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { compileInstrument } from "@/compiler/compileInstrument";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("compileInstrument profiles", () => {
  it("builds track modules from source and fx profile ids", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "wavetable",
      fxChain: ["reverb", "delay", "distortion", "chorus"],
    };

    const compiled = compileInstrument(document);
    const compiledTrack = compiled.tracks[0];
    if (!compiledTrack) {
      throw new Error("Expected a compiled first track");
    }

    expect(compiledTrack.sourceProfileId).toBe("wavetable");
    expect(compiledTrack.fxChain).toEqual([
      "reverb",
      "delay",
      "distortion",
      "chorus",
    ]);

    expect(
      compiledTrack.compiledTrack.engine.modules
        .map(({ id, moduleType }) => ({ id, moduleType }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual(
      expect.arrayContaining([
        { id: "track-1.source.main", moduleType: ModuleType.Wavetable },
        { id: "track-1.fx1.main", moduleType: ModuleType.Reverb },
        { id: "track-1.fx2.main", moduleType: ModuleType.Delay },
        { id: "track-1.fx3.main", moduleType: ModuleType.Distortion },
        { id: "track-1.fx4.main", moduleType: ModuleType.Chorus },
      ]),
    );

    const sourcePage = compiledTrack.compiledTrack.pages[0];
    if (!sourcePage) {
      throw new Error("Expected a sourceAmp page for the first track");
    }

    const topLeftSlot = sourcePage.regions[0].slots[0];
    if (topLeftSlot.kind !== "slot") {
      throw new Error("Expected the first source page slot to be populated");
    }

    expect(topLeftSlot.slotKey).toBe("position");
    expect(topLeftSlot.binding).toEqual({
      kind: "module-prop",
      moduleId: "track-1.source.main",
      moduleType: ModuleType.Wavetable,
      propKey: "position",
    });
  });
});
