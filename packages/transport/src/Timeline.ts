import { ClockTime } from "./types";
import { insertionIndexBy } from "./utils";

export type TimelineEvent = {
  time: ClockTime;
};

export class Timeline<T extends TimelineEvent = TimelineEvent> {
  private _events: Readonly<T>[] = [];

  get events(): readonly Readonly<T>[] {
    return this._events;
  }

  /**
   * Add a new event to the timeline. It will be inserted according to its
   * `time` property (which must be present; otherwise an exception is thrown).
   *
   * If the time of the new event is exactly equal to the time of an existing
   * event in the timeline, the existing event is considered to occur before
   * the new event.
   */
  add(event: Readonly<T>) {
    const idx = insertionIndexBy(this._events, event, (a, b) => {
      return a.time - b.time;
    });
    this._events.splice(idx, 0, event);
  }

  find(start: ClockTime, end: ClockTime): readonly Readonly<T>[] {
    return this._events.filter((event) => {
      return event.time >= start && event.time < end;
    });
  }

  /** Return the last event that occurred at or before the specified time. */
  lastEventBefore(time: ClockTime) {
    for (let i = this._events.length - 1; i >= 0; i--) {
      const event = this._events[i];
      if (event.time <= time) {
        return event;
      }
    }
    return undefined;
  }

  remove(start: ClockTime, end: ClockTime) {
    this._events = this._events.filter((event) => {
      return !(event.time >= start && event.time < end);
    });
  }

  removeAllBefore(time: ClockTime) {
    this._events = this._events.filter((event) => event.time >= time);
  }

  clear() {
    this._events = [];
  }
}
