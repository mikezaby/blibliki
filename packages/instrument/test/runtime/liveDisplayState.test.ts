import { TransportState } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import { createLiveInstrumentDisplayState } from "@/runtime/liveDisplayState";

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
});
