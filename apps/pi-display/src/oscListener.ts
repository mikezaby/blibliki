import {
  decodeDisplayOscPacket,
  encodeDisplayOscMessage,
  type DisplayOscMessage,
} from "@blibliki/display-protocol";
import { createSocket } from "node:dgram";
import type { DisplayAppConfig } from "@/config";
import type { DisplayStore } from "@/displayStore";
import type { DisplayLogger } from "@/logger";

export type OscListenerSocket = {
  on: (event: "message", listener: (packet: Buffer) => void) => unknown;
  bind: (port: number, callback?: () => void) => void;
  send: (packet: Uint8Array, port: number, host: string) => void;
  close: () => void;
};

export type OscListenerDependencies = {
  createSocket?: () => OscListenerSocket;
};

export type OscListener = {
  start: (onStateChange: () => void) => void;
  close: () => void;
};

export function createOscListener(
  config: DisplayAppConfig,
  store: DisplayStore,
  logger: DisplayLogger,
  dependencies: OscListenerDependencies = {},
): OscListener {
  const socket = (
    dependencies.createSocket ??
    (() => createSocket("udp4") as OscListenerSocket)
  )();
  let started = false;

  return {
    start(onStateChange) {
      if (started) {
        return;
      }

      started = true;

      socket.on("message", (packet: Buffer) => {
        let message: DisplayOscMessage;

        try {
          message = decodeDisplayOscPacket(new Uint8Array(packet));
        } catch (error) {
          logger.debug(
            `decode error: ${error instanceof Error ? error.message : String(error)}`,
          );
          return;
        }

        logger.debugMessage(message);
        const previousRevision = store.getState()?.revision;
        const nextState = store.apply(message);

        if (nextState && nextState.revision !== previousRevision) {
          logger.debugState(nextState);
          onStateChange();
        }
      });

      socket.bind(config.displayPort, () => {
        const request = encodeDisplayOscMessage({
          type: "display.request_full_state",
        });

        socket.send(request, config.piPort, config.piHost);
        logger.debug(
          `listening on ${config.displayPort}, requesting full state from ${config.piHost}:${config.piPort}`,
        );
      });
    },
    close() {
      socket.close();
    },
  };
}
