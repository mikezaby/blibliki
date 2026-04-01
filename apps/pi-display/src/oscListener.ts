import {
  decodeDisplayOscPacket,
  encodeDisplayOscMessage,
  type DisplayOscMessage,
} from "@blibliki/display-protocol";
import { createSocket, type Socket } from "node:dgram";
import type { DisplayAppConfig } from "@/config";
import type { DisplayStore } from "@/displayStore";
import type { DisplayLogger } from "@/logger";

export type OscListenerDependencies = {
  createSocket?: () => Socket;
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
  const socket = (dependencies.createSocket ?? (() => createSocket("udp4")))();
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
