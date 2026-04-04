import type { DisplayProtocolState } from "@blibliki/display-protocol";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
  type InstrumentDisplayState,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { instrumentDisplayStateToProtocol } from "@/displayProtocol";
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

function createFixtureDisplayState() {
  const runtimeState = createInstrumentRuntimeState(
    createInstrumentEnginePatch(createSeededInstrumentDocument()),
  );

  return createInstrumentDisplayState(runtimeState);
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
  } as unknown as InstrumentDisplayState;
}

describe("instrumentDisplayStateToProtocol", () => {
  it("maps the runtime display state into renderer-ready protocol state", () => {
    const protocol: DisplayProtocolState = instrumentDisplayStateToProtocol(
      createFixtureDisplayState(),
    );

    expect(protocol.header.left).toBe("Blibliki");
    expect(protocol.header.center).toBe("track-1");
    expect(protocol.header.right).toContain("Page 1");
    expect(protocol.header.transport).toBe("STOP");
    expect(protocol.header.mode).toBe("PERF");
    expect(protocol.bands).toHaveLength(3);
    expect(protocol.bands[0]).toEqual(
      expect.objectContaining({
        key: "global",
        title: "GLOBAL",
      }),
    );
    const tempoValue = protocol.bands[0]?.cells[0]?.value;
    if (tempoValue?.kind !== "number") {
      throw new Error("Expected first global cell to be a numeric tempo value");
    }

    expect(tempoValue.formatted).toBe("120 BPM");
    expect(tempoValue.visualNormalized).not.toBeNull();
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

    if (
      belowOneValue.visualNormalized === null ||
      aboveOneValue.visualNormalized === null
    ) {
      throw new Error(
        "Expected schema-bound slot to map to normalized protocol values",
      );
    }

    expect(belowOneValue.visualNormalized).toBeCloseTo(
      Math.pow(0.99 / 10, 1 / 7),
      6,
    );
    expect(aboveOneValue.visualNormalized).toBeCloseTo(
      Math.pow(1.01 / 10, 1 / 7),
      6,
    );
    expect(aboveOneValue.visualNormalized).toBeGreaterThan(
      belowOneValue.visualNormalized,
    );
  });

  it("uses notices in the protocol header when the Pi asks for save confirmation", () => {
    const displayState = createFixtureDisplayState();
    displayState.notice = {
      title: "SAVE TO CLOUD?",
      message: "SHIFT+NEXT AGAIN",
      tone: "warning",
    };

    const protocol = instrumentDisplayStateToProtocol(displayState);

    expect(protocol.header.center).toBe("SAVE TO CLOUD?");
    expect(protocol.header.right).toBe("SHIFT+NEXT AGAIN");
  });
});
