import { BPM, ClockTime, Ticks } from "./types";
import { secondsPerTick, ticksPerSecond } from "./utils";

export class Tempo {
  private clockTimeAtLastTempoChange = 0;
  private ticksAtLastTempoChange = 0;
  private _bpm = 120;

  get bpm() {
    return this._bpm;
  }

  update(clockTime: ClockTime, tempo: BPM) {
    const ticks = this.getTicks(clockTime);
    this.clockTimeAtLastTempoChange = clockTime;
    this.ticksAtLastTempoChange = ticks;
    this._bpm = tempo;
  }

  getTicks(clockTime: ClockTime): Ticks {
    const clockDelta = clockTime - this.clockTimeAtLastTempoChange;
    const tickDelta = clockDelta * ticksPerSecond(this.bpm);
    return Math.floor(this.ticksAtLastTempoChange + tickDelta);
  }

  getClockTime(ticks: Ticks): ClockTime {
    const tickDelta = Math.floor(ticks - this.ticksAtLastTempoChange);
    const clockDelta = tickDelta * secondsPerTick(this.bpm);
    return this.clockTimeAtLastTempoChange + clockDelta;
  }

  reset(clockTime: ClockTime, ticks: Ticks) {
    this.clockTimeAtLastTempoChange = clockTime;
    this.ticksAtLastTempoChange = ticks;
  }
}
