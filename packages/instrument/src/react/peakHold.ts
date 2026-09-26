// A held peak rises to any new peak at once and stays there for the hold
// window, then follows the current level. A readout that tracks it moves on
// peaks and rests in between.
export type PeakHold = { level: number; since: number };

export const PEAK_HOLD_MS = 1500;

export function advancePeakHold(
  hold: PeakHold,
  level: number,
  now: number,
  holdMs = PEAK_HOLD_MS,
): PeakHold {
  if (level >= hold.level) {
    return { level, since: now };
  }

  if (now - hold.since >= holdMs) {
    return { level, since: now };
  }

  return hold;
}
