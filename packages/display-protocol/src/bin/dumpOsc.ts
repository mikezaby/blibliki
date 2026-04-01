import { createSocket } from "node:dgram";
import {
  DEFAULT_DISPLAY_OSC_PORT,
  decodeDisplayOscPacket,
  type DisplayOscMessage,
} from "@/index";

const listenPort = Number.parseInt(
  process.env.BLIBLIKI_DEBUG_DUMP_PORT ?? `${DEFAULT_DISPLAY_OSC_PORT}`,
  10,
);
const socket = createSocket("udp4");

function summarize(message: DisplayOscMessage) {
  if (message.type === "display.request_full_state") {
    return "display.request_full_state";
  }

  if (message.type === "display.full") {
    return `display.full revision=${message.state.revision} track=${message.state.header.center} right="${message.state.header.right}"`;
  }

  if (message.type === "display.header") {
    return `display.header revision=${message.revision} track=${message.header.center} right="${message.header.right}"`;
  }

  return `display.band revision=${message.revision} band=${message.bandKey} title="${message.band.title}"`;
}

socket.on("message", (packet) => {
  try {
    const message = decodeDisplayOscPacket(new Uint8Array(packet));
    console.log(`[display-protocol] ${summarize(message)}`);
  } catch (error) {
    console.error(
      `[display-protocol] decode error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

socket.bind(listenPort, () => {
  console.log(
    `[display-protocol] dumping OSC packets on udp://127.0.0.1:${listenPort}`,
  );
});
