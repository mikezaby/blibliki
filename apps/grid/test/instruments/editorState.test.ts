import { describe, expect, it } from "vitest";
import {
  createDefaultInstrumentDocument,
  type InstrumentDocument,
} from "../../src/instruments/document";
import {
  cloneInstrumentDocument,
  updateSequencerStep,
  updateTrackDocument,
  updateTrackFxChain,
} from "../../src/instruments/editorState";

function createDocument(): InstrumentDocument {
  return createDefaultInstrumentDocument();
}

describe("instrument editor state helpers", () => {
  it("clones documents so editor updates do not mutate the original data", () => {
    const document = createDocument();
    const cloned = cloneInstrumentDocument(document);

    cloned.tracks[0]!.sourceProfileId = "osc";

    expect(document.tracks[0]!.sourceProfileId).toBe("unassigned");
    expect(cloned.tracks[0]!.sourceProfileId).toBe("osc");
  });

  it("updates the selected track metadata fields", () => {
    const updated = updateTrackDocument(createDocument(), 0, {
      name: "Bass",
      enabled: false,
      midiChannel: 3,
      noteSource: "stepSequencer",
      sourceProfileId: "threeOsc",
    });

    expect(updated.tracks[0]).toEqual(
      expect.objectContaining({
        name: "Bass",
        enabled: false,
        midiChannel: 3,
        noteSource: "stepSequencer",
        sourceProfileId: "threeOsc",
      }),
    );
  });

  it("updates a single fx slot without disturbing the rest of the chain", () => {
    const updated = updateTrackFxChain(createDocument(), 0, 2, "reverb");

    expect(updated.tracks[0]?.fxChain).toEqual([
      "distortion",
      "chorus",
      "reverb",
      "reverb",
    ]);
  });

  it("updates the selected sequencer step content", () => {
    const updated = updateSequencerStep(createDocument(), 0, 0, 0, {
      active: true,
      notes: [{ note: "C3", velocity: 90 }],
      probability: 75,
      microtimeOffset: 4,
      duration: "1/8",
    });

    expect(updated.tracks[0]?.sequencer.pages[0]?.steps[0]).toEqual({
      active: true,
      notes: [{ note: "C3", velocity: 90 }],
      probability: 75,
      microtimeOffset: 4,
      duration: "1/8",
    });
  });
});
