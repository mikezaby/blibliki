import { TransportState } from "@blibliki/engine";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { createLiveInstrumentDisplayState } from "@/liveDisplayState";

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

function createSequencedInstrumentDocument() {
  const document = createSeededInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    noteSource: "stepSequencer",
    sequencer: {
      ...firstTrack.sequencer,
      loopLength: 2,
      pages: [
        {
          name: "Page 1",
          steps: [
            {
              active: true,
              notes: [{ note: "C3", velocity: 80 }],
              probability: 75,
              microtimeOffset: 10,
              duration: "1/8",
            },
            ...Array.from({ length: 15 }, () => ({
              active: false,
              notes: [],
              probability: 100,
              microtimeOffset: 0,
              duration: "1/16" as const,
            })),
          ],
        },
        ...firstTrack.sequencer.pages.slice(1),
      ],
    },
  };

  return document;
}

describe("createLiveInstrumentDisplayState", () => {
  it("resolves visible values from the live engine module props", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );

    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [
        module.id,
        module.id === "track-1.source.main"
          ? { ...module, props: { ...module.props, wave: "square" } }
          : module.id === "track-1.amp.envelope"
            ? { ...module, props: { ...module.props, attack: 0.5 } }
            : module.id === "instrument.runtime.transportControl"
              ? { ...module, props: { ...module.props, bpm: 132, swing: 0.25 } }
              : module.id === "instrument.runtime.masterVolume"
                ? { ...module, props: { ...module.props, gain: 0.7 } }
                : module,
      ]),
    );

    const displayState = createLiveInstrumentDisplayState(
      {
        state: TransportState.playing,
        findModule: (id: string) => {
          const module = modules.get(id);
          if (!module) {
            throw new Error(`Module ${id} not found`);
          }

          return module;
        },
      },
      runtimePatch,
    );

    expect(displayState.header.transportState).toBe(TransportState.playing);
    expect(displayState.globalBand.slots[0].valueText).toBe("132 BPM");
    expect(displayState.globalBand.slots[1].valueText).toBe("25%");
    expect(displayState.globalBand.slots[7].valueText).toBe("70%");
    expect(displayState.upperBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "square",
      }),
    );
    expect(displayState.lowerBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "0.5",
      }),
    );
  });

  it("renders seq edit rows from the active step sequencer state", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSequencedInstrumentDocument(),
      {
        navigation: {
          activeTrackIndex: 0,
          activePage: "sourceAmp",
          mode: "seqEdit",
          shiftPressed: false,
          sequencerPageIndex: 0,
          selectedStepIndex: 0,
        },
      },
    );

    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );

    const displayState = createLiveInstrumentDisplayState(
      {
        state: TransportState.stopped,
        findModule: (id: string) => {
          const module = modules.get(id);
          if (!module) {
            throw new Error(`Module ${id} not found`);
          }

          return module;
        },
      },
      runtimePatch,
    );

    expect(displayState.header.mode).toBe("seqEdit");
    expect(displayState.globalBand.slots[0]).toEqual(
      expect.objectContaining({
        label: "Active",
        shortLabel: "ACT",
        valueText: "ON",
      }),
    );
    expect(displayState.globalBand.slots[1]).toEqual(
      expect.objectContaining({
        label: "Probability",
        shortLabel: "PROB",
        valueText: "75%",
      }),
    );
    expect(displayState.globalBand.slots[7]).toEqual(
      expect.objectContaining({
        label: "Loop Length",
        shortLabel: "LOOP",
        valueText: "2",
      }),
    );
    expect(displayState.upperBand.title).toBe("VELOCITY");
    expect(displayState.upperBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "80",
      }),
    );
    expect(displayState.lowerBand.title).toBe("PITCH");
    expect(displayState.lowerBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "C3",
      }),
    );
  });
});
