import { describe, expect, it } from "vitest";
import {
  createDebugBandMessage,
  createDebugFullState,
  readDebugFixtureBandKey,
  readDebugFixtureTargetClass,
} from "@/fixtures";
import { decodeDisplayOscPacket, encodeDisplayOscMessage } from "@/index";

describe("display protocol fixtures", () => {
  it("creates a full debug state that round-trips through the osc codec", () => {
    const state = createDebugFullState();
    const decoded = decodeDisplayOscPacket(
      encodeDisplayOscMessage({
        type: "display.full",
        state,
      }),
    );

    if (decoded.type !== "display.full") {
      throw new Error("Expected full snapshot");
    }

    expect(decoded.state.revision).toBe(state.revision);
    expect(decoded.state.header).toEqual(state.header);
    const firstValue = decoded.state.bands[0]?.cells[0]?.value;
    expect(firstValue?.raw).toBe(120);
    expect(firstValue?.formatted).toBe("120 BPM");
    expect(state.revision).toBeGreaterThan(0);
    expect(state.header.right).toContain("Page");
  });

  it("creates a global-band fixture message with the expected revision", () => {
    const message = createDebugBandMessage();

    expect(message.revision).toBe(2);
    expect(message.bandKey).toBe("global");
  });

  it("can create an upper-band fixture message for partial-update debugging", () => {
    const message = createDebugBandMessage(5, "upper");

    expect(message.revision).toBe(5);
    expect(message.bandKey).toBe("upper");
    expect(message.band.key).toBe("upper");
    expect(message.band.title).toBe("SOURCE");
  });

  it("can create a compact-standard full debug state for 800x480 testing", () => {
    const state = createDebugFullState(3, "compact-standard");
    const decoded = decodeDisplayOscPacket(
      encodeDisplayOscMessage({
        type: "display.full",
        state,
      }),
    );

    if (decoded.type !== "display.full") {
      throw new Error("Expected full snapshot");
    }

    expect(decoded.state.revision).toBe(3);
    expect(decoded.state.screen.targetClass).toBe("compact-standard");
  });

  it("reads the requested fixture target class from the environment", () => {
    expect(
      readDebugFixtureTargetClass({
        BLIBLIKI_DEBUG_TARGET_CLASS: "compact-standard",
      } as NodeJS.ProcessEnv),
    ).toBe("compact-standard");
  });

  it("reads a requested band key from debug sender arguments", () => {
    expect(readDebugFixtureBandKey(["--band", "lower"])).toBe("lower");
  });
});
