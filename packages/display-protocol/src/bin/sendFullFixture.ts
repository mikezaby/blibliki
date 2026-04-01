import { createSocket } from "node:dgram";
import { encodeDisplayOscMessage } from "@/codec";
import {
  createDebugFullState,
  readDebugFixtureNetworkConfig,
  readDebugFixtureTargetClass,
} from "@/fixtures";

const network = readDebugFixtureNetworkConfig();
const socket = createSocket("udp4");
const targetClass = readDebugFixtureTargetClass();
const state = createDebugFullState(1, targetClass);
const packet = encodeDisplayOscMessage({
  type: "display.full",
  state,
});

socket.send(packet, network.displayPort, network.host, () => {
  console.log(
    `[display-protocol] sent full fixture revision=${state.revision} target=${state.screen.targetClass} to ${network.host}:${network.displayPort}`,
  );
  socket.close();
});
