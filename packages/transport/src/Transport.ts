import { Context } from "@blibliki/utils";
import { Clock } from "./Clock";
import { Position } from "./Position";
import { Scheduler } from "./Scheduler";
import { Tempo } from "./Tempo";
import { TimelineEvent } from "./Timeline";
import { Timer } from "./Timer";
import {
  BPM,
  ClockTime,
  ContextTime,
  NormalRange,
  Ticks,
  TimeSignature,
} from "./types";
import { swing } from "./utils";

export interface TransportEvent extends TimelineEvent {
  ticks: Ticks;
  contextTime: ContextTime;
}

/**
 * Given a (future) transport time window (in ticks), return all events that should
 * occur within the window. This function is responsible for setting the ticks
 * value for the events returned.
 *
 * IMPORTANT: Subsequent calls to this function may have overlapping time windows.
 * Be careful to not return the same event more than once.
 */
export type TransportEventGenerator<T extends TransportEvent> = (
  start: Ticks,
  end: Ticks,
) => readonly Readonly<T>[];

/**
 * Schedule the specified event with the audio system. The transport class is
 * responsible for setting the `contextTime` of the events.
 */
export type TransportEventConsumer<T extends TransportEvent> = (
  event: Readonly<T>,
) => void;

export type TransportListener<T extends TransportEvent> = {
  generator: TransportEventGenerator<T>;
  consumer: TransportEventConsumer<T>;
  onJump: (ticks: Ticks) => void;
  onStart: (contextTime: ContextTime) => void;
  onStop: (contextTime: ContextTime) => void;
  silence: (contextTime: ContextTime) => void;
};

/**
 * Transport callback that gets invoked at (roughly) sixteenth note intervals.
 *
 * Returns the current clock time in seconds.
 *
 * IMPORTANT! Do not rely on this callback for audio precision mechanisms!
 * It is only accurate up to the precision of the event sheduler rate, and may
 * "jump" if the scheduling is struggling to keep up.
 */
export type TransportClockCallback = (
  time: ClockTime,
  contextTime: ContextTime,
) => void;

export enum TransportState {
  playing = "playing",
  stopped = "stopped",
  paused = "paused",
}

/**
 * This class converts (music) transport time into audio clock time.
 */
export class Transport<T extends TransportEvent> {
  private _initialized = false;

  private context: Readonly<Context>;
  private clock: Readonly<Clock>;
  private timer: Readonly<Timer>;
  private scheduler: Readonly<Scheduler<T>>;

  private _timeSignature: TimeSignature = [4, 4];

  private tempo: Readonly<Tempo> = new Tempo();
  private clockTime = 0;
  private _swingAmount: NormalRange = 0.5;

  private listener: Readonly<TransportListener<T>>;

  private _clockCallbacks: TransportClockCallback[] = [];

  constructor(
    context: Readonly<Context>,
    listener: Readonly<TransportListener<T>>,
  ) {
    // ### Make these adapt to performance of app? Or let user set them?
    const SCHEDULE_INTERVAL_MS = 20;
    const SCHEDULE_WINDOW_SIZE_MS = 200;

    this.context = context;
    this.listener = listener;
    this.clock = new Clock(this.context, SCHEDULE_WINDOW_SIZE_MS / 1000);

    this.scheduler = new Scheduler<T>(
      this.generateEvents,
      this.consumeEvents,
      SCHEDULE_WINDOW_SIZE_MS / 1000,
    );

    this.timer = new Timer(() => {
      const time = this.clock.time();
      const contextTime = this.clock.clockTimeToContextTime(time);
      if (time <= this.clockTime) return;

      this.clockTime = time;
      this.scheduler.runUntil(time);
      this._clockCallbacks.forEach((callback) => {
        callback(this.clockTime, contextTime);
      });
    }, SCHEDULE_INTERVAL_MS / 1000);

    this._initialized = true;
  }

  addClockCallback(callback: TransportClockCallback) {
    this._clockCallbacks.push(callback);
  }

  // ??? Make this more efficient (no need to compute full position, for example)
  addBarCallback(callback: (bar: number) => void) {
    let currentBar = Infinity;
    this.addClockCallback(() => {
      const pos = this.position;
      if (pos.bars !== currentBar) {
        callback(pos.bars);
        currentBar = pos.bars;
      }
    });
  }

  get time() {
    return this.clock.time();
  }

  /**
   * Return the (approximate) current Transport time, in ticks.
   */
  get position(): Readonly<Position> {
    const clockTime = this.clock.time();
    const ticks = this.tempo.getTicks(clockTime);
    return new Position(ticks, this.timeSignature);
  }

  /**
   * Set the current Transport time.
   */
  set position(position: Readonly<Position>) {
    this.jumpTo(position.ticks);
  }

  getPositionOfEvent(event: Readonly<TransportEvent>): Readonly<Position> {
    return new Position(event.ticks, this.timeSignature);
  }

  /**
   * Start the Transport.
   */
  start() {
    if (!this._initialized) throw new Error("Not initialized");
    if (this.clock.isRunning) return;

    const actionAt = this.context.currentTime;

    this.listener.onStart(actionAt);
    this.clock.start(actionAt);
    this.timer.start();
  }

  /**
   * Stop the Transport.
   */
  stop() {
    if (!this._initialized) throw new Error("Not initialized");

    const actionAt = this.context.currentTime;

    this.listener.silence(actionAt);
    this.listener.onStop(actionAt);
    this.clock.stop(actionAt);
    this.timer.stop();
  }

  /**
   * Reset the Transport to zero.
   */
  reset() {
    if (!this._initialized) throw new Error("Not initialized");

    const actionAt = this.context.currentTime;
    this.listener.silence(actionAt);
    this.jumpTo(0);
  }

  get bpm(): BPM {
    return this.tempo.bpm;
  }

  set bpm(bpm: BPM) {
    this.tempo.update(this.clockTime, bpm);
  }

  get timeSignature() {
    return this._timeSignature;
  }

  set timeSignature(value: TimeSignature) {
    this._timeSignature = value;
  }

  get state() {
    if (this.clock.isRunning) return TransportState.playing;
    else if (this.time > 0) return TransportState.paused;
    else return TransportState.stopped;
  }

  get swingAmount() {
    return this._swingAmount;
  }

  set swingAmount(amount: NormalRange) {
    this._swingAmount = amount;
  }

  private jumpTo(ticks: Ticks) {
    const clockTime = this.tempo.getClockTime(ticks);
    this.tempo.reset(clockTime, ticks);
    this.clock.jumpTo(clockTime);
    this.scheduler.jumpTo(clockTime);
    this.clockTime = clockTime;
    this.listener.onJump(ticks);
    this._clockCallbacks.forEach((callback) => {
      callback(
        this.clockTime,
        this.clock.clockTimeToContextTime(this.clockTime),
      );
    });
  }

  private generateEvents = (
    start: ClockTime,
    end: ClockTime,
  ): readonly Readonly<T>[] => {
    // Get transport-time events and return them as clock-time events
    const transportStart = this.tempo.getTicks(start);
    const transportEnd = this.tempo.getTicks(end);
    return this.listener
      .generator(transportStart, transportEnd)
      .map((event) => {
        // Apply swing
        return {
          ...event,
          ticks: swing(event.ticks, this.swingAmount),
        };
      })
      .map((event) => {
        const time = this.tempo.getClockTime(event.ticks);
        const contextTime = this.clock.clockTimeToContextTime(time);
        return {
          ...event,
          time,
          contextTime,
        };
      });
  };

  private consumeEvents = (events: readonly Readonly<T>[]) => {
    events.forEach((event) => {
      this.listener.consumer(event);
    });
  };
}
