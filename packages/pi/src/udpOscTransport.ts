import { createSocket as createDgramSocket } from "node:dgram";

export type UdpOscDisplayTransportSocket = {
  on: (
    event: "message",
    listener: (packet: Uint8Array) => void,
  ) => UdpOscDisplayTransportSocket;
  off: (
    event: "message",
    listener: (packet: Uint8Array) => void,
  ) => UdpOscDisplayTransportSocket;
  bind: (port: number) => void;
  send: (packet: Uint8Array, port: number, host: string) => void;
  close: () => void;
};

export type UdpOscDisplayTransport = {
  send: (packet: Uint8Array, port: number, host: string) => void;
  onMessage: (listener: (packet: Uint8Array) => void) => () => void;
  close: () => void;
};

export type CreateUdpOscDisplayTransportOptions = {
  controlPort: number;
  createSocket?: () => UdpOscDisplayTransportSocket;
};

function createSocket(): UdpOscDisplayTransportSocket {
  return createDgramSocket("udp4") as UdpOscDisplayTransportSocket;
}

export function createUdpOscDisplayTransport({
  controlPort,
  createSocket: createSocketOverride = createSocket,
}: CreateUdpOscDisplayTransportOptions): UdpOscDisplayTransport {
  const socket = createSocketOverride();
  const listeners = new Set<(packet: Uint8Array) => void>();
  let closed = false;

  const handleMessage = (packet: Uint8Array) => {
    if (closed) {
      return;
    }

    for (const listener of listeners) {
      listener(packet);
    }
  };

  socket.on("message", handleMessage);
  socket.bind(controlPort);

  return {
    send(packet, port, host) {
      if (closed) {
        return;
      }

      socket.send(packet, port, host);
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      if (closed) {
        return;
      }

      closed = true;
      listeners.clear();
      socket.off("message", handleMessage);
      socket.close();
    },
  };
}
