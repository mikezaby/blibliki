import { TPB } from "../utils";

const MICROTIMING_STEP = TPB / 4 / 100; // 1% of a 16th note

export function calculateMicrotimingOffset(microtimeOffset: number): number {
  return microtimeOffset * MICROTIMING_STEP;
}
