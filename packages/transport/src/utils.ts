import { TransportPosition } from "./Transport";
import { BPM, NormalRange, Ticks } from "./types";

// Ticks per beat
export const TPB = 15360;

export const secondsPerTick = (tempo: BPM) => {
  return 60 / tempo / TPB;
};

export const ticksPerSecond = (tempo: BPM) => {
  return (tempo / 60) * TPB;
};

export function ticksToPosition(
  ticks: Ticks,
  beatsPerBar: number,
): Readonly<TransportPosition> {
  const tb = ticks / 15360; // Time in beats, along timeline (a floating point number)
  const tbi = Math.floor(tb); // Current beat as integer
  const bf = tb - tbi; // Fraction between current beat and next

  const beat = tbi % beatsPerBar;
  const bar = Math.floor(tbi / beatsPerBar);
  const sixteenth = Math.floor(bf * 4);

  return {
    bar,
    beat,
    sixteenth,
  };
}

export function positionToTicks(
  position: Readonly<TransportPosition>,
  beatsPerBar: number,
): Ticks {
  const tb =
    position.bar * beatsPerBar + position.beat + position.sixteenth / 4;
  return tb * 15360;
}

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
