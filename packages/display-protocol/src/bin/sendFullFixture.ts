import { createSocket } from "node:dgram";
import { encodeDisplayOscMessage } from "@/codec";
import {
  createDebugFullState,
  readDebugFixtureNetworkConfig,
} from "@/fixtures";

const network = readDebugFixtureNetworkConfig();
const socket = createSocket("udp4");
const state = createDebugFullState();
const packet = encodeDisplayOscMessage({
  type: "display.full",
  state,
});

socket.send(packet, network.displayPort, network.host, () => {
  console.log(
    `[display-protocol] sent full fixture revision=${state.revision} to ${network.host}:${network.displayPort}`,
  );
  socket.close();
});
