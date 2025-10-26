import { isNumber } from "@blibliki/utils";
import { Engine } from "@/Engine";
import { now } from ".";

export type BarsBeatsSixteenths = `${number}:${number}:${number}`;
export type TTime = number | BarsBeatsSixteenths | Time;

export const t = (value?: TTime): Time => {
  value ??= now();

  if (value instanceof Time) return value;

  return new Time(value);
};

export const nt = (value?: TTime): number => {
  value ??= now();

  if (typeof value === "number") return value;

  return t(value).toNumber();
};

export default class Time {
  private value: number | BarsBeatsSixteenths;
  private _notation?: BarsBeatsSixteenths;
  private _number?: number;

  constructor(value: TTime) {
    this.value = value instanceof Time ? value.value : value;

    if (isNumber(this.value)) {
      this._number = this.value;
    } else {
      this._notation = this.value;
    }
  }

  add(value: TTime): Time {
    return t(this.toNumber() + t(value).toNumber());
  }

  subtract(value: TTime): Time {
    return t(this.toNumber() - nt(value));
  }

  isBefore(value: TTime): boolean {
    return this.toNumber() < nt(value);
  }

  isAfter(value: TTime): boolean {
    return this.toNumber() > nt(value);
  }

  isEqual(value: TTime): boolean {
    return this.toNumber() > nt(value);
  }

  toNotation(): BarsBeatsSixteenths {
    if (this._notation) return this._notation;

    const [count, factor] = this.transport.timeSignature;
    const divisionsPerBeat = 16 / factor;
    const divisionsPerBar = count * divisionsPerBeat;
    const secondsPerBeat = 60 / this.transport.bpm;

    const totalDivisions = Math.floor(
      ((this.value as number) / secondsPerBeat) * divisionsPerBeat,
    );

    const bars = Math.floor(totalDivisions / divisionsPerBar) + 1;
    const beats =
      Math.floor((totalDivisions % divisionsPerBar) / divisionsPerBeat) + 1;
    const divisions = (totalDivisions % divisionsPerBeat) + 1;

    this._notation = `${bars}:${beats}:${divisions}`;

    return this._notation;
  }

  toNumber(): number {
    if (isNumber(this._number)) return this._number;

    const [beatsPerBar, sixteenths] = this.transport.timeSignature;
    const secondsPerBeat = 60 / this.transport.bpm;

    const [bars, beats, divisions] = (this.value as BarsBeatsSixteenths)
      .split(":")
      .map(Number);

    const totalBeats =
      bars * beatsPerBar + beats + divisions / (sixteenths / 4);

    this._number = totalBeats * secondsPerBeat;

    return this._number;
  }

  private get transport() {
    return Engine.current.transport;
  }
}
