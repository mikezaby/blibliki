import type { DisplayProtocolState } from "@blibliki/display-protocol";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
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
});
