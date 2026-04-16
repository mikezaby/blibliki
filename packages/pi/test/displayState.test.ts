import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import {
  createInstrumentDisplayState,
  createInstrumentRuntimeState,
} from "@/instrumentRuntime";

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

describe("createInstrumentDisplayState", () => {
  it("derives header, global band, and upper/lower page bands from the runtime state", () => {
    const runtimeState = createInstrumentRuntimeState(
      createInstrumentEnginePatch(createSeededInstrumentDocument()),
    );
    const displayState = createInstrumentDisplayState(runtimeState);

    expect(displayState.header).toEqual({
      instrumentName: "Default Instrument",
      trackName: "track-1",
      pageKey: "sourceAmp",
      controllerPage: 1,
      midiChannel: 1,
      transportState: "stopped",
      mode: "performance",
    });

    expect(displayState.globalBand.slots[0]).toEqual(
      expect.objectContaining({
        key: "tempo",
        label: "Tempo",
        shortLabel: "BPM",
        cc: 13,
        rawValue: 120,
        valueText: "120 BPM",
      }),
    );
    expect(displayState.globalBand.slots[1]).toEqual(
      expect.objectContaining({
        key: "swing",
        label: "Swing",
        shortLabel: "SWG",
        cc: 14,
        rawValue: 0,
        valueText: "0%",
      }),
    );
    expect(displayState.globalBand.slots[2]).toEqual(
      expect.objectContaining({
        key: "masterFilterCutoff",
        label: "Master Filter Cutoff",
        shortLabel: "MCF",
        cc: 15,
        rawValue: 20000,
        valueText: "20000",
      }),
    );
    expect(displayState.globalBand.slots[3]).toEqual(
      expect.objectContaining({
        key: "masterFilterResonance",
        label: "Master Filter Resonance",
        shortLabel: "MRQ",
        cc: 16,
        rawValue: 1,
        valueText: "1",
      }),
    );
    expect(displayState.globalBand.slots[4]).toEqual(
      expect.objectContaining({
        key: "reverbSend",
        label: "Reverb Send",
        shortLabel: "REV",
        cc: 17,
        rawValue: 0,
        inactive: undefined,
        valueText: "0%",
      }),
    );
    expect(displayState.globalBand.slots[5]).toEqual(
      expect.objectContaining({
        key: "delaySend",
        label: "Delay Send",
        shortLabel: "DLY",
        cc: 18,
        rawValue: 0,
        inactive: undefined,
        valueText: "0%",
      }),
    );
    expect(displayState.globalBand.slots[6]).toEqual(
      expect.objectContaining({
        key: "inactive",
        label: "Inactive",
        shortLabel: "---",
        cc: 19,
        inactive: true,
        valueText: "--",
      }),
    );
    expect(displayState.globalBand.slots[7]).toEqual(
      expect.objectContaining({
        key: "masterVolume",
        label: "Main Volume",
        shortLabel: "VOL",
        cc: 20,
        rawValue: 1,
        valueText: "100%",
      }),
    );

    expect(displayState.upperBand.position).toBe("top");
    expect(displayState.upperBand.title).toBe("SOURCE");
    expect(displayState.upperBand.slots[0]).toEqual(
      expect.objectContaining({
        kind: "slot",
        label: "Waveform",
        shortLabel: "WAVE",
        cc: 21,
        valueText: "sine",
      }),
    );
    if (displayState.upperBand.slots[0].kind !== "slot") {
      throw new Error("Expected first upper-band cell to be a populated slot");
    }
    expect(displayState.upperBand.slots[0].valueSpec.kind).toBe("enum");
    expect(displayState.upperBand.slots[6]).toEqual({
      kind: "empty",
      valueText: "--",
    });

    expect(displayState.lowerBand.position).toBe("bottom");
    expect(displayState.lowerBand.title).toBe("AMP");
    expect(displayState.lowerBand.slots[0]).toEqual(
      expect.objectContaining({
        kind: "slot",
        label: "Attack",
        shortLabel: "A",
        cc: 29,
        valueText: "0.01",
      }),
    );
    if (displayState.lowerBand.slots[0].kind !== "slot") {
      throw new Error("Expected first lower-band cell to be a populated slot");
    }
    expect(displayState.lowerBand.slots[0].valueSpec).toMatchObject({
      kind: "number",
      min: 0,
      max: 10,
      exp: 7,
    });
    expect(displayState.lowerBand.slots[7]).toEqual(
      expect.objectContaining({
        kind: "slot",
        label: "Gain",
        shortLabel: "GAIN",
        cc: 36,
        valueText: "1",
      }),
    );
    if (displayState.lowerBand.slots[7].kind !== "slot") {
      throw new Error("Expected last lower-band cell to be a populated slot");
    }
    expect(displayState.lowerBand.slots[7].valueSpec).toMatchObject({
      kind: "number",
      min: 0,
      max: 2,
    });
  });
});
