import { createInstrumentEnginePatch } from "@blibliki/instrument";
import { createDefaultInstrumentDocument } from "@blibliki/instrument";
import { createRuntimeDisplayState } from "@blibliki/instrument";
import { createInstrumentRuntimeState } from "@blibliki/instrument";
import type { InstrumentDisplayState } from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { instrumentDisplayStateToProtocol } from "@/index";

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

function createFixtureDisplayState() {
  const runtimeState = createInstrumentRuntimeState(
    createInstrumentEnginePatch(createSeededInstrumentDocument()),
  );

  return createRuntimeDisplayState(runtimeState);
}

function createSchemaBoundDisplayState(value: number): InstrumentDisplayState {
  return {
    header: {
      instrumentName: "Test Instrument",
      trackName: "track-1",
      pageKey: "sourceAmp",
      controllerPage: 1,
      midiChannel: 1,
      transportState: "stopped",
      mode: "performance",
    },
    globalBand: {
      slots: Array.from({ length: 8 }, (_, index) => ({
        key: `global-${index}`,
        label: `Global ${index}`,
        shortLabel: `G${index}`,
        cc: 13 + index,
        valueText: "--",
      })) as InstrumentDisplayState["globalBand"]["slots"],
    },
    upperBand: {
      position: "top",
      title: "AMP",
      slots: [
        {
          kind: "slot",
          blockKey: "amp",
          slotKey: "attack",
          label: "Attack",
          shortLabel: "A",
          cc: 21,
          valueText: `${value}`,
          rawValue: value,
          valueSpec: {
            kind: "number",
            min: 0,
            max: 10,
            step: 0.01,
            exp: 7,
          },
        },
        { kind: "empty", valueText: "--" },
        { kind: "empty", valueText: "--" },
        { kind: "empty", valueText: "--" },
        { kind: "empty", valueText: "--" },
        { kind: "empty", valueText: "--" },
        { kind: "empty", valueText: "--" },
        { kind: "empty", valueText: "--" },
      ] as unknown as InstrumentDisplayState["upperBand"]["slots"],
    },
    lowerBand: {
      position: "bottom",
      title: "EMPTY",
      slots: Array.from({ length: 8 }, () => ({
        kind: "empty",
        valueText: "--",
      })) as InstrumentDisplayState["lowerBand"]["slots"],
    },
  } as InstrumentDisplayState;
}

describe("instrumentDisplayStateToProtocol", () => {
  it("maps the runtime display state into renderer-ready protocol state", () => {
    const protocol = instrumentDisplayStateToProtocol(
      createFixtureDisplayState(),
    );

    expect(protocol.header.left).toBe("Blibliki");
    expect(protocol.header.center).toBe("track-1");
    expect(protocol.header.right).toContain("Page 1");
    expect(protocol.header.transport).toBe("STOP");
    expect(protocol.header.mode).toBe("PERF");
    expect(protocol.bands).toHaveLength(3);
  });

  it("normalizes numeric display values from schema metadata without resetting across range heuristics", () => {
    const belowOneProtocol = instrumentDisplayStateToProtocol(
      createSchemaBoundDisplayState(0.99),
    );
    const aboveOneProtocol = instrumentDisplayStateToProtocol(
      createSchemaBoundDisplayState(1.01),
    );

    const belowOneValue = belowOneProtocol.bands[1]?.cells[0]?.value;
    const aboveOneValue = aboveOneProtocol.bands[1]?.cells[0]?.value;

    if (belowOneValue?.kind !== "number" || aboveOneValue?.kind !== "number") {
      throw new Error(
        "Expected schema-bound slot to map to numeric protocol values",
      );
    }

    expect(aboveOneValue.visualNormalized).toBeGreaterThan(
      belowOneValue.visualNormalized ?? 0,
    );
  });
});
