import { describe, expect, it } from "vitest";
import { createDefaultPlayableInstrumentDocument } from "@/document/playableDocument";

describe("createDefaultPlayableInstrumentDocument", () => {
  it("keeps the default instrument scaffold but makes the first track immediately playable", () => {
    const document = createDefaultPlayableInstrumentDocument();

    expect(document.name).toBe("Default Instrument");
    expect(document.tracks).toHaveLength(8);
    expect(document.tracks[0]).toEqual(
      expect.objectContaining({
        key: "track-1",
        midiChannel: 1,
        noteSource: "externalMidi",
        sourceProfileId: "osc",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      }),
    );

    expect(document.tracks.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "track-2",
          sourceProfileId: "unassigned",
        }),
      ]),
    );
  });
});
