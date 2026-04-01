import { describe, expect, it } from "vitest";
import { createDebugBandMessage, createDebugFullState } from "@/fixtures";
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
});
