import {
  DEFAULT_DISPLAY_OSC_HOST,
  DEFAULT_DISPLAY_OSC_PORT,
  DEFAULT_PI_OSC_PORT,
  decodeDisplayOscPacket,
  encodeDisplayOscMessage,
  type DisplayProtocolState,
} from "@blibliki/display-protocol";

export type OscDisplayPublisherTransport = {
  send: (packet: Uint8Array, port: number, host: string) => void;
  onMessage: (listener: (packet: Uint8Array) => void) => () => void;
  close: () => void;
};

export type OscDisplayPublisher = {
  publish: (state: DisplayProtocolState) => void;
  dispose: () => void;
};

export type CreateOscDisplayPublisherOptions = {
  transport: OscDisplayPublisherTransport;
  host?: string;
  displayPort?: number;
  controlPort?: number;
  debugLog?: (message: string) => void;
};

function summarizeState(state: DisplayProtocolState) {
  return `revision=${state.revision} track=${state.header.center} right="${state.header.right}"`;
}

function sendFullState(
  transport: OscDisplayPublisherTransport,
  host: string,
  displayPort: number,
  state: DisplayProtocolState,
) {
  transport.send(
    encodeDisplayOscMessage({
      type: "display.full",
      state,
    }),
    displayPort,
    host,
  );
}

export function createOscDisplayPublisher({
  transport,
  host = DEFAULT_DISPLAY_OSC_HOST,
  displayPort = DEFAULT_DISPLAY_OSC_PORT,
  controlPort: _controlPort = DEFAULT_PI_OSC_PORT,
  debugLog,
}: CreateOscDisplayPublisherOptions): OscDisplayPublisher {
  let latestState: DisplayProtocolState | undefined;
  let disposed = false;

  const unsubscribe = transport.onMessage((packet) => {
    if (disposed) {
      return;
    }

    const message = decodeDisplayOscPacket(packet);
    if (message.type !== "display.request_full_state" || !latestState) {
      return;
    }

    debugLog?.("request_full_state");
    debugLog?.(`resend ${summarizeState(latestState)}`);
    sendFullState(transport, host, displayPort, latestState);
  });

  return {
    publish(state) {
      if (disposed) {
        return;
      }

      latestState = state;
      debugLog?.(`publish ${summarizeState(state)}`);
      sendFullState(transport, host, displayPort, state);
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      unsubscribe();
      transport.close();
    },
  };
}
