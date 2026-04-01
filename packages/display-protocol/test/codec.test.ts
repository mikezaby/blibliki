import { describe, expect, it } from "vitest";
import {
  decodeDisplayOscPacket,
  encodeDisplayOscMessage,
  type DisplayOscMessage,
  type DisplayProtocolState,
} from "@/index";

function createStateFixture(): DisplayProtocolState {
  return {
    revision: 9,
    screen: {
      orientation: "landscape",
      targetClass: "standard",
    },
    header: {
      left: "Debug",
      center: "track-1",
      right: "Page 1: SOURCE / AMP",
      transport: "STOP",
      mode: "PERF",
    },
    bands: [],
  };
}

describe("display OSC codec", () => {
  it("round-trips a full snapshot message", () => {
    const message: DisplayOscMessage = {
      type: "display.full",
      state: createStateFixture(),
    };

    expect(decodeDisplayOscPacket(encodeDisplayOscMessage(message))).toEqual(
      message,
    );
  });

  it("round-trips a request_full_state control message", () => {
    expect(
      decodeDisplayOscPacket(
        encodeDisplayOscMessage({ type: "display.request_full_state" }),
      ),
    ).toEqual({ type: "display.request_full_state" });
  });
});
