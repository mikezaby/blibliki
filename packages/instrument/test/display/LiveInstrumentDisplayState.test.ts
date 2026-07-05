import { TransportState } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createLiveInstrumentDisplayState } from "@/display/LiveInstrumentDisplayState";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

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

describe("LiveInstrumentDisplayState", () => {
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
            : module.id === "track-1.trackGain.main"
              ? { ...module, props: { ...module.props, volume: -18.5 } }
              : module.id === "instrument.runtime.transportControl"
                ? {
                    ...module,
                    props: { ...module.props, bpm: 132, swing: 0.25 },
                  }
                : module.id === "master.trackGain.main"
                  ? { ...module, props: { ...module.props, volume: -12 } }
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
    expect(displayState.header.trackVolume).toBe(-18.5);
    expect(displayState.globalBand.slots[0].valueText).toBe("132 BPM");
    expect(displayState.globalBand.slots[1].valueText).toBe("25%");
    expect(displayState.globalBand.slots[7].valueText).toBe("-12 dB");
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

  it("renders enabled global macro slots from the runtime patch", () => {
    const document = createSeededInstrumentDocument();
    document.globalController = {
      ...document.globalController,
      macros: document.globalController.macros.map((macro, index) =>
        index === 0
          ? {
              ...macro,
              enabled: true,
              name: "Tone Sweep",
              value: 0.42,
            }
          : macro,
      ),
    };
    const runtimePatch = createInstrumentEnginePatch(document);
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );

    const displayState = createLiveInstrumentDisplayState(
      {
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

    expect(displayState.globalBand.slots[2]).toEqual(
      expect.objectContaining({
        key: "global-macro-1",
        macroId: "global-macro-1",
        label: "Tone Sweep",
        shortLabel: "Tone Sweep",
        cc: 15,
        inactive: false,
        rawValue: 0.42,
        valueText: "42%",
      }),
    );
  });

  it("exposes the native -1..1 range for bipolar macros so the fill centres", () => {
    const document = createSeededInstrumentDocument();
    document.globalController = {
      ...document.globalController,
      macros: document.globalController.macros.map((macro, index) =>
        index === 0
          ? {
              ...macro,
              enabled: true,
              polarity: "bipolar" as const,
              value: -0.5,
            }
          : macro,
      ),
    };
    const runtimePatch = createInstrumentEnginePatch(document);
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );

    const displayState = createLiveInstrumentDisplayState(
      {
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

    const slot = displayState.globalBand.slots[2];
    expect(slot).toEqual(
      expect.objectContaining({
        macroId: "global-macro-1",
        rawValue: -0.5,
        valueText: "-50%",
      }),
    );
    expect(slot.valueSpec).toEqual({
      kind: "number",
      min: -1,
      max: 1,
      step: 0.01,
    });
  });
});
