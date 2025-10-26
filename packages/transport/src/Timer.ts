import { Context } from "@blibliki/utils";
// import { clearInterval, setInterval } from "audio-context-timers";
import { ContextTime } from "./types";

export const scheduleAtContextTime = ({
  scheduleAt,
  context,
  callback,
}: {
  scheduleAt: ContextTime;
  context: Context;
  callback: () => void;
}) => {
  const now = context.currentTime;
  if (now > scheduleAt) throw Error("Could not schedule event at past");

  const ms = (scheduleAt - now) * 1000;

  setTimeout(callback, ms);
};

export class Timer {
  private timerId: number | undefined = undefined;

  private interval: number;
  private callback: () => void;

  constructor(callback: () => void, intervalMs: number) {
    this.callback = callback;
    this.interval = intervalMs;
  }

  start() {
    this.timerId = setInterval(() => {
      this.callback();
    }, this.interval);
  }

  stop() {
    if (this.timerId === undefined) return;

    clearInterval(this.timerId);
    this.timerId = undefined;
  }

  get isRunning() {
    return this.timerId !== undefined;
  }
}
