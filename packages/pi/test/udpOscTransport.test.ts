import { describe, expect, it, vi } from "vitest";
import { createUdpOscDisplayTransport } from "@/udpOscTransport";

type FakeSocket = {
  on: (event: "message", listener: (packet: Uint8Array) => void) => FakeSocket;
  off: (event: "message", listener: (packet: Uint8Array) => void) => FakeSocket;
  bind: (port: number) => void;
  send: (packet: Uint8Array, port: number, host: string) => void;
  close: () => void;
  emitMessage: (packet: Uint8Array) => void;
};

function createFakeSocket(): FakeSocket {
  let messageListener: ((packet: Uint8Array) => void) | undefined;
  const socket: FakeSocket = {
    on: vi.fn<FakeSocket["on"]>((_event, listener) => {
      messageListener = listener;
      return socket;
    }),
    off: vi.fn<FakeSocket["off"]>((_event, listener) => {
      if (messageListener === listener) {
        messageListener = undefined;
      }
      return socket;
    }),
    bind: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    emitMessage(packet) {
      messageListener?.(packet);
    },
  };

  return socket;
}

describe("createUdpOscDisplayTransport", () => {
  it("binds the control port, forwards messages, and delegates sends", () => {
    const socket = createFakeSocket();
    const transport = createUdpOscDisplayTransport({
      controlPort: 41235,
      createSocket: () => socket,
    });
    const listener = vi.fn();
    const packet = new Uint8Array([1, 2, 3]);

    const unsubscribe = transport.onMessage(listener);
    socket.emitMessage(packet);
    transport.send(packet, 41234, "127.0.0.1");
    unsubscribe();
    transport.close();

    expect(socket.bind).toHaveBeenCalledWith(41235);
    expect(listener).toHaveBeenCalledWith(packet);
    expect(socket.send).toHaveBeenCalledWith(packet, 41234, "127.0.0.1");
    expect(socket.off).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });
});
