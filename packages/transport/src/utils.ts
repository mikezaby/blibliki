import { BPM } from "./types";

// Ticks per beat
export const TPB = 15360;

export const secondsPerTick = (tempo: BPM) => {
  return 60 / tempo / TPB;
};

export const ticksPerSecond = (tempo: BPM) => {
  return (tempo / 60) * TPB;
};
