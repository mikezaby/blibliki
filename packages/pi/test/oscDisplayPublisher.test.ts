import {
  decodeDisplayOscPacket,
  encodeDisplayOscMessage,
  type DisplayProtocolState,
} from "@blibliki/display-protocol";
import { describe, expect, it, vi } from "vitest";
import { createOscDisplayPublisher } from "@/oscDisplayPublisher";

function createStateFixture(): DisplayProtocolState {
  return {
    revision: 4,
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

function createFakeTransport() {
  const sent: { packet: Uint8Array; port: number; host: string }[] = [];
  let listener: ((packet: Uint8Array) => void) | undefined;
  let closed = false;

  return {
    sent,
    get closed() {
      return closed;
    },
    send(packet: Uint8Array, port: number, host: string) {
      sent.push({ packet, port, host });
    },
    onMessage(nextListener: (packet: Uint8Array) => void) {
      listener = nextListener;
      return () => {
        listener = undefined;
      };
    },
    emit(packet: Uint8Array) {
      listener?.(packet);
    },
    close() {
      closed = true;
    },
  };
}

describe("createOscDisplayPublisher", () => {
  it("publishes a full snapshot to the display port and resends it on request", () => {
    const transport = createFakeTransport();
    const publisher = createOscDisplayPublisher({
      transport,
      host: "127.0.0.1",
      displayPort: 41234,
      controlPort: 41235,
    });
    const state = createStateFixture();

    publisher.publish(state);

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]?.host).toBe("127.0.0.1");
    expect(transport.sent[0]?.port).toBe(41234);
    expect(
      decodeDisplayOscPacket(transport.sent[0]?.packet ?? new Uint8Array()),
    ).toEqual({
      type: "display.full",
      state,
    });

    transport.emit(
      encodeDisplayOscMessage({ type: "display.request_full_state" }),
    );

    expect(transport.sent).toHaveLength(2);
    expect(
      decodeDisplayOscPacket(transport.sent[1]?.packet ?? new Uint8Array()),
    ).toEqual({
      type: "display.full",
      state,
    });

    publisher.dispose();

    expect(transport.closed).toBe(true);
  });

  it("logs publish and resync events when debug logging is enabled", () => {
    const transport = createFakeTransport();
    const debugLog = vi.fn();
    const publisher = createOscDisplayPublisher({
      transport,
      host: "127.0.0.1",
      displayPort: 41234,
      controlPort: 41235,
      debugLog,
    });
    const state = createStateFixture();

    publisher.publish(state);
    transport.emit(
      encodeDisplayOscMessage({ type: "display.request_full_state" }),
    );

    expect(debugLog).toHaveBeenCalledWith(
      'publish revision=4 track=track-1 right="Page 1: SOURCE / AMP"',
    );
    expect(debugLog).toHaveBeenCalledWith("request_full_state");
    expect(debugLog).toHaveBeenCalledWith(
      'resend revision=4 track=track-1 right="Page 1: SOURCE / AMP"',
    );
  });
});
