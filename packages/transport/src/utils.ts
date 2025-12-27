import { BPM, NormalRange, Ticks } from "./types";

// Ticks per beat
export const TPB = 15360;

export const secondsPerTick = (tempo: BPM) => {
  return 60 / tempo / TPB;
};

export const ticksPerSecond = (tempo: BPM) => {
  return (tempo / 60) * TPB;
};

export const insertionIndexBy = <T>(
  arr: T[],
  n: T,
  comparatorFn: (a: T, b: T) => number,
) => {
  const index = arr.findIndex((el) => comparatorFn(n, el) < 0);
  return index === -1 ? arr.length : index;
};

export function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

export function unlerp(t: number, a: number, b: number): number {
  return (t - a) / (b - a);
}

/**
 * Compute swing.
 *
 * This function is an attempt at mirroring the behaviour in the Reason DAW,
 * where events before the 50% eighth mark are "expanded" and events past the
 * mark are "compressed". That is, this function transforms the underlying
 * transport time grid:
 *
 *  No swing  |<--50%-->|<--50%-->|<--50%-->| ...
 *  16ths     0         1         2         3 ...
 *  8ths      0         |         1         | ...
 *  Notes     X======X  X===X     |         |
 *            |         |         |         |
 *            |          \        |          \
 *  60% swing |<---60%--->|<-40%->|<---60%--->| ...
 *  16ths     0           1       2           3 ...
 *  8ths      0           |       1           | ...
 *  Notes     X=======X   X==X    |           |
 *
 * If it is challenging to explain this mechanism to end users, you could
 * use the approach taken in the Logic DAW, which has 6 "swing modes":
 *
 *  16A: 50%
 *  16B: 54%
 *  16C: 58%
 *  16D: 62%
 *  16E: 66%
 *  16F: 71%
 *
 * For details, see
 * https://www.attackmagazine.com/technique/passing-notes/daw-drum-machine-swing/2/
 *
 * @param time Time of event, in transport ticks (1/4 = 15360 pulses)
 * @param amount Swing amount in range [0.5, 0.75].
 * @returns New time of the event, with swing applied.
 */
export function swing(time: Ticks, amount: NormalRange): Ticks {
  if (amount < 0.5 || amount > 0.75) {
    throw new Error("Invalid swing amount");
  }

  /*
    Note lengths in ticks:

      1/4 = 15360
      1/8 = 7680
      1/16 = 3840
  */

  const t8 = time / 7680; // Input time in 8ths
  const t8i = Math.floor(t8); // 8th in which the time sits
  const t = t8 - t8i; // Percentage position in the 8th in which the time sits

  /* 
    ### We could make this a bit more efficient; we can simplify the 
    <=0.5 case to

      (t / 0.5) * amount

    But the >0.5 case is more difficult:

      amount + ((t - 0.5) / 0.5) * (1 - amount)

    Using the lerp/unlerp functions here makes it clear what's going on,
    though, so we'll keep them for now.
  */
  let tn = 0;
  if (t <= 0.5) {
    tn = lerp(unlerp(t, 0.0, 0.5), 0.0, amount);
  } else {
    tn = lerp(unlerp(t, 0.5, 1.0), amount, 1.0);
  }

  // Map transformed time back into ticks
  return Math.floor((t8i + tn) * 7680);
}

/**
 * Duration notation:
 * - "n" = note (64n = 64th note, 32n = 32nd note, 16n = 16th note, etc.)
 * - "t" = triplet (16t = 16th note triplet)
 * - "." = dotted (adds half the duration, e.g., 4n. = quarter + eighth)
 * - "m" = measure/bar (1m = 1 bar, 1.5m = 1.5 bars, etc.)
 * - "infinite" = hold forever (no noteoff, caller must handle)
 */
export type NoteDuration =
  | "64n"
  | "64t"
  | "32n"
  | "32t"
  | "32n."
  | "16n"
  | "16t"
  | "16n."
  | "8n"
  | "8t"
  | "8n."
  | "4n"
  | "4t"
  | "4n."
  | "2n"
  | "2t"
  | "2n."
  | "1m"
  | "1.5m"
  | "2m"
  | "2.5m"
  | "3m"
  | "3.5m"
  | "4m"
  | "5m"
  | "6m"
  | "7m"
  | "8m"
  | "infinite";

/**
 * Convert NoteDuration to ticks.
 * Returns null for "infinite" duration.
 *
 * Calculation:
 * - Base note: TPB * (4 / noteValue)
 *   - 64n = TPB * 4/64 = TPB/16
 *   - 32n = TPB * 4/32 = TPB/8
 *   - 16n = TPB * 4/16 = TPB/4
 *   - 8n = TPB * 4/8 = TPB/2
 *   - 4n = TPB * 4/4 = TPB (quarter note)
 *   - 2n = TPB * 4/2 = TPB*2 (half note)
 *   - 1n = TPB * 4/1 = TPB*4 (whole note = 1 bar in 4/4)
 * - Triplet (t): multiply by 2/3
 * - Dotted (.): multiply by 1.5
 * - Measure (m): multiply by 4 * TPB
 */
export function durationToTicks(duration: NoteDuration): Ticks {
  // Defensive: handle invalid input (runtime safety for old data)
  if (typeof duration !== "string") {
    console.warn(`Invalid duration value, using default "8n."`);
    duration = "8n." as NoteDuration;
  }

  if (duration === "infinite") return Infinity;

  // Handle measure notation (bars)
  if (duration.endsWith("m")) {
    const bars = parseFloat(duration.slice(0, -1));
    return Math.round(bars * 4 * TPB); // 1 bar = 4 quarters = 4 * TPB
  }

  // Parse note notation
  const isDotted = duration.endsWith(".");
  const isTriplet = duration.endsWith("t");
  const noteStr = isDotted
    ? duration.slice(0, -2)
    : isTriplet
      ? duration.slice(0, -1)
      : duration.slice(0, -1);

  const noteValue = parseInt(noteStr, 10);

  // Calculate base duration in ticks
  let ticks = (TPB * 4) / noteValue;

  // Apply triplet (2/3 of normal duration)
  if (isTriplet) {
    ticks = (ticks * 2) / 3;
  }

  // Apply dotted (1.5x normal duration)
  if (isDotted) {
    ticks = ticks * 1.5;
  }

  return Math.round(ticks);
}
