import { createSocket } from "node:dgram";
import { encodeDisplayOscMessage } from "@/codec";
import {
  createDebugBandMessage,
  type DebugBandMessage,
  readDebugFixtureBandKey,
  readDebugFixtureNetworkConfig,
} from "@/fixtures";

const network = readDebugFixtureNetworkConfig();
const socket = createSocket("udp4");
const bandKey = readDebugFixtureBandKey();
const message: DebugBandMessage = createDebugBandMessage(2, bandKey);
const packet = encodeDisplayOscMessage(message);
const revision = message.revision;

socket.send(packet, network.displayPort, network.host, () => {
  console.log(
    `[display-protocol] sent band fixture revision=${revision} band=${message.bandKey} to ${network.host}:${network.displayPort}`,
  );
  socket.close();
});
