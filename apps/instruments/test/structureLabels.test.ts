import {
  createDefaultInstrumentDocument,
  findInstrumentRecipe,
  selectTrackAudioSource,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import {
  summarizeDocument,
  summarizeTrack,
  trackLabel,
} from "../src/structureLabels";

const groovebox = findInstrumentRecipe("groovebox")!.document;

describe("structureLabels", () => {
  it("labels a track by its name, or by its position when it has none", () => {
    const document = createDefaultInstrumentDocument();

    expect(trackLabel(groovebox, 1)).toBe("Bass");
    expect(trackLabel(document, 1)).toBe("Track 2");
    expect(trackLabel(document, 7)).toBe("Master");
  });

  it("summarizes a track in the order a player thinks about it", () => {
    expect(summarizeTrack(groovebox, 0)).toBe(
      "Drum machine · sequencer · ch 1 · Compressor",
    );
    expect(summarizeTrack(groovebox, 2)).toBe(
      "Three osc · sequencer · ch 3 · Chorus → Delay → Reverb",
    );
  });

  it("says where a fed track gets its audio instead of naming a source", () => {
    const document = selectTrackAudioSource(groovebox, 2, "track-2");

    expect(summarizeTrack(document, 2)).toBe(
      "Fed from Bass · sequencer · Chorus → Delay → Reverb",
    );
  });

  it("says a switched off track is off and nothing more", () => {
    expect(summarizeTrack(groovebox, 3)).toBe("Off");
  });

  it("summarizes the master by its effects only", () => {
    expect(summarizeTrack(groovebox, 7)).toBe("No effects");
  });

  it("summarizes a document by the tracks that make sound", () => {
    expect(summarizeDocument(groovebox)).toBe("Drums · Bass · Lead");
    expect(summarizeDocument(createDefaultInstrumentDocument())).toBe(
      "7 empty tracks",
    );
  });
});
