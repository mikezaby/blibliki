import type {
  DisplayOscMessage,
  DisplayProtocolState,
} from "@blibliki/display-protocol";

export type DisplayLogger = {
  debug: (message: string) => void;
  debugMessage: (message: DisplayOscMessage) => void;
  debugState: (state: DisplayProtocolState) => void;
};

function summarizeState(state: DisplayProtocolState) {
  return `revision=${state.revision} track=${state.header.center} transport=${state.header.transport} right="${state.header.right}"`;
}

export function createDisplayLogger(
  enabled: boolean,
  writer: Pick<typeof console, "log"> = console,
): DisplayLogger {
  return {
    debug(message) {
      if (!enabled) {
        return;
      }

      writer.log(`[pi-display] ${message}`);
    },
    debugMessage(message) {
      if (!enabled) {
        return;
      }

      if (message.type === "display.request_full_state") {
        writer.log("[pi-display] request_full_state");
        return;
      }

      if (message.type === "display.full") {
        writer.log(
          `[pi-display] display.full ${summarizeState(message.state)}`,
        );
        return;
      }

      if (message.type === "display.header") {
        writer.log(
          `[pi-display] display.header revision=${message.revision} track=${message.header.center} right="${message.header.right}"`,
        );
        return;
      }

      writer.log(
        `[pi-display] display.band revision=${message.revision} band=${message.bandKey} title="${message.band.title}"`,
      );
    },
    debugState(state) {
      if (!enabled) {
        return;
      }

      writer.log(`[pi-display] render ${summarizeState(state)}`);
    },
  };
}
