import { isNumber } from "@blibliki/utils";
import { Ticks, TimeSignature, TPosition, TStringPosition } from "./types";
import { TPB } from "./utils";

export const sixteenthPerBeat = (timeSignature: Readonly<TimeSignature>) => {
  const denominator = timeSignature[1];
  return 16 / denominator;
};

/**
 * Represents a musical position that can be expressed in multiple formats:
 * - Ticks (raw MIDI time units)
 * - Bars:Beats:Sixteenths (string format like "1:2:8")
 * - Object format with bars, beats, and sixteenths properties
 */
export class Position {
  private readonly _ticks: Ticks;
  private timeSignature: Readonly<TimeSignature>;

  /**
   * Creates a new Position instance
   * @param value - Position value in ticks, string format ("bars:beats:sixteenths"), or object format
   * @param timeSignature - Time signature as [numerator, denominator] (e.g., [4, 4] for 4/4)
   */
  constructor(
    value: Ticks | TPosition | TStringPosition,
    timeSignature: TimeSignature,
  ) {
    this.timeSignature = timeSignature;

    if (isNumber(value)) {
      this._ticks = value;
    } else if (typeof value === "string") {
      this._ticks = this.parseStringPosition(value);
    } else {
      this._ticks = this.convertObjectToTicks(value);
    }
  }

  get ticks() {
    return this._ticks;
  }

  get bars() {
    return Math.floor(this.totalBeats / this.timeSignature[0]) + 1;
  }

  get beats() {
    return (this.totalBeats % this.timeSignature[0]) + 1;
  }

  get sixteenths() {
    return Math.floor(this.beatFraction * 4) + 1;
  }

  get totalBeats() {
    return Math.floor(this._ticks / TPB);
  }

  get beatFraction() {
    return this._ticks / TPB - this.totalBeats;
  }

  toString(): string {
    return `${this.bars}:${this.beats}:${this.sixteenths}`;
  }

  toObject(): TPosition {
    return {
      bars: this.bars,
      beats: this.beats,
      sixteenths: this.sixteenths,
    };
  }

  private parseStringPosition(positionString: TStringPosition): Ticks {
    const parts = positionString.split(":");

    const [barsStr, beatsStr, sixteenthsStr] = parts;
    const bars = Number(barsStr);
    const beats = Number(beatsStr);
    const sixteenths = Number(sixteenthsStr);

    const position: TPosition = { bars, beats, sixteenths };

    return this.convertObjectToTicks(position);
  }

  private convertObjectToTicks(position: TPosition): Ticks {
    const totalBeats =
      (position.bars - 1) * this.timeSignature[0] + (position.beats - 1);
    const beatFraction = position.sixteenths / 16;
    return (totalBeats + beatFraction) * TPB;
  }
}
