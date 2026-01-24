import { Context } from "@blibliki/utils";
import { ClockTime, ContextTime, Seconds } from "./types";

export class Clock {
  private context: Readonly<Context>;
  private clockTimeAt: { start: ClockTime; stop: ClockTime };
  private contextTimeAt: { start: ContextTime; stop: ContextTime };
  private audioClockOffset: number;

  private _isRunning = false;

  constructor(context: Readonly<Context>, audioClockOffset: Seconds) {
    this.context = context;
    this.audioClockOffset = audioClockOffset;

    this.clockTimeAt = { start: 0, stop: 0 };
    this.contextTimeAt = { start: 0, stop: 0 };
  }

  get isRunning() {
    return this._isRunning;
  }

  time() {
    if (!this.isRunning) return this.clockTimeAt.stop;

    const now = this.context.currentTime;
    return this.clockTimeAt.start + (now - this.contextTimeAt.start);
  }

  start(actionAt: ContextTime) {
    this.contextTimeAt.start = actionAt;
    this.clockTimeAt.start = this.clockTimeAt.stop;
    this._isRunning = true;

    return this.clockTimeAt.start;
  }

  stop(actionAt: ContextTime) {
    this._isRunning = false;
    this.clockTimeAt.stop =
      this.clockTimeAt.start + (actionAt - this.contextTimeAt.start);
    this.contextTimeAt.stop = actionAt;

    return this.clockTimeAt.stop;
  }

  jumpTo(time: ClockTime) {
    this.clockTimeAt.stop = time;
  }

  clockTimeToContextTime(clockTime: ClockTime): ContextTime {
    const type = this.isRunning ? "start" : "stop";

    return (
      this.audioClockOffset +
      this.contextTimeAt[type] +
      clockTime -
      this.clockTimeAt[type]
    );
  }

  contextTimeToClockTime(contextTime: ContextTime): ClockTime {
    const type = this.isRunning ? "start" : "stop";

    return (
      contextTime -
      this.audioClockOffset -
      this.contextTimeAt[type] +
      this.clockTimeAt[type]
    );
  }
}
