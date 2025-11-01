export type Seconds = number;

export type ClockTime = number;
export type ContextTime = number;
export type Ticks = number;

export type BPM = number;
export type TimeSignature = [number, TimeSignatureDenominator];
export type TimeSignatureDenominator = 2 | 4 | 8 | 16;
export type TPosition = { bars: number; beats: number; sixteenths: number };
export type TStringPosition = `${number}:${number}:${number}`;

/**
 * A number that is between [0, 1]
 */
export type NormalRange = number;
