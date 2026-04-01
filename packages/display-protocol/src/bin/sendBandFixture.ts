import { createSocket } from "node:dgram";
import { encodeDisplayOscMessage } from "@/codec";
import {
  createDebugBandMessage,
  type DebugBandMessage,
  readDebugFixtureNetworkConfig,
} from "@/fixtures";

const network = readDebugFixtureNetworkConfig();
const socket = createSocket("udp4");
const message: DebugBandMessage = createDebugBandMessage();
const packet = encodeDisplayOscMessage(message);
const revision = message.revision;

socket.send(packet, network.displayPort, network.host, () => {
  console.log(
    `[display-protocol] sent band fixture revision=${revision} to ${network.host}:${network.displayPort}`,
  );
  socket.close();
});
