import { Timeline, TimelineEvent } from "./Timeline";
import { ClockTime, Seconds } from "./types";

/**
 * Return all events that occur in the interval [start, end).
 */
export type EventGenerator<T extends TimelineEvent> = (
  start: ClockTime,
  end: ClockTime,
) => readonly Readonly<T>[];

/** Consume the speified event. */
export type EventConsumer<T extends TimelineEvent> = (
  events: readonly Readonly<T>[],
) => void;

/**
 * The scheduler is responsible for tracking the scheduling/playback window.
 *
 * Scheduling of events always precedes playback of events. The left hand
 * edge of the scheduling window is the point in time up to where events have
 * been consumed so far. The right hand edge of the window is the point in time
 * up to where events have been scheduled/prepared. The width of the window is
 * always the same (specified when the Scheduler instance is created).
 */
export class Scheduler<T extends TimelineEvent = TimelineEvent> {
  private timeline = new Timeline<T>();

  private scheduleAheadTime: Seconds;
  private consumedTime: ClockTime;

  private generator: EventGenerator<T>;
  private consumer: EventConsumer<T>;

  constructor(
    generator: EventGenerator<T>,
    consumer: EventConsumer<T>,
    scheduleAheadTime: Seconds,
  ) {
    this.generator = generator;
    this.consumer = consumer;
    this.scheduleAheadTime = scheduleAheadTime;
    this.consumedTime = -this.scheduleAheadTime;
  }

  private _schedule(start: Seconds, end: Seconds) {
    this.generator(start, end).forEach((e) => {
      this.timeline.add(e);
    });
  }

  /**
   * Consume events up to the specified time.
   *
   * This will also generate new events up until `time + scheduleAheadTime`.
   */
  runUntil(time: ClockTime) {
    if (time <= this.consumedTime) {
      throw new Error("Scheduling time is <= current time");
    }

    /* 
      Generate events that occur between the previous and new right-hand edges 
      of the scheduling window. I.e., move scheduling time forwards by the 
      specified amount.
    */
    this._schedule(
      this.consumedTime + this.scheduleAheadTime,
      time + this.scheduleAheadTime,
    );

    /*
      Consume events that occur between the previous and new left-hand edges
      of the scheduling window. I.e., move playback time forwards by the
      specified amount.
    */
    const events = this.timeline.find(this.consumedTime, time);
    this.consumer(events);
    this.consumedTime = time;

    /*
      Remove all events that were consumed from the timeline.
    */
    this.timeline.removeAllBefore(this.consumedTime);
  }

  /**
   * Jump to the specified destination time.
   */
  jumpTo(time: ClockTime) {
    this.timeline.clear();
    this.consumedTime = time - this.scheduleAheadTime;
  }
}
