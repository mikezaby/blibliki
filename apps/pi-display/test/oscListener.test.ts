import {
  encodeDisplayOscMessage,
  type DisplayProtocolState,
} from "@blibliki/display-protocol";
import { describe, expect, it, vi } from "vitest";
import type { DisplayAppConfig } from "@/config";
import { createDisplayStore } from "@/displayStore";
import { createDisplayLogger } from "@/logger";
import { createOscListener } from "@/oscListener";
import type { OscListenerSocket } from "@/oscListener";

type FakeSocket = OscListenerSocket & {
  on: (event: "message", listener: (packet: Buffer) => void) => FakeSocket;
  bind: (port: number, callback?: () => void) => void;
  send: (packet: Uint8Array, port: number, host: string) => void;
  close: () => void;
  emitMessage: (packet: Uint8Array) => void;
};

function createState(revision: number): DisplayProtocolState {
  return {
    revision,
    screen: {
      orientation: "landscape",
      targetClass: "standard",
    },
    header: {
      left: "BLIBLIKI PI",
      center: "track-1",
      right: "Page 1: SOURCE / AMP",
      transport: "STOP",
      mode: "PERF",
    },
    bands: [],
  };
}

function createFakeSocket(): FakeSocket {
  let messageListener: ((packet: Buffer) => void) | undefined;

  const socket: FakeSocket = {
    on: vi.fn<FakeSocket["on"]>((_event, listener) => {
      messageListener = listener;
      return socket;
    }),
    bind: vi.fn<FakeSocket["bind"]>((_port, callback) => {
      callback?.();
    }),
    send: vi.fn(),
    close: vi.fn(),
    emitMessage(packet) {
      messageListener?.(Buffer.from(packet));
    },
  };

  return socket;
}

describe("createOscListener", () => {
  it("binds the display port, requests a full snapshot, and applies incoming state", () => {
    const socket = createFakeSocket();
    const store = createDisplayStore();
    const onStateChange = vi.fn();
    const writer = { log: vi.fn() };
    const listener = createOscListener(
      {
        displayPort: 41234,
        piHost: "127.0.0.1",
        piPort: 41235,
        debug: true,
      } satisfies DisplayAppConfig,
      store,
      createDisplayLogger(true, writer),
      {
        createSocket: () => socket,
      },
    );

    listener.start(onStateChange);

    expect(socket.bind).toHaveBeenCalledWith(41234, expect.any(Function));
    expect(socket.send).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      41235,
      "127.0.0.1",
    );

    socket.emitMessage(
      encodeDisplayOscMessage({
        type: "display.full",
        state: createState(4),
      }),
    );

    expect(store.getState()?.revision).toBe(4);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(writer.log).toHaveBeenCalledWith(
      expect.stringContaining("requesting full state"),
    );
    expect(writer.log).toHaveBeenCalledWith(
      expect.stringContaining("display.full revision=4"),
    );
  });
});
