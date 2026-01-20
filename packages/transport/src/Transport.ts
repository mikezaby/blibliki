import { Context } from "@blibliki/utils";
import { Clock } from "./Clock";
import { Position } from "./Position";
import { Scheduler } from "./Scheduler";
import { Tempo } from "./Tempo";
import { TimelineEvent } from "./Timeline";
import { Timer } from "./Timer";
import { SourceEvent } from "./sources/BaseSource";
import { SourceManager } from "./sources/SourceManager";
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
  ticks: Ticks,
) => void;

/**
 * Transport properties that can be observed for changes.
 */
export type TransportProperty = "bpm" | "timeSignature" | "swingAmount";

/**
 * Transport callback that gets invoked when a property changes.
 */
export type TransportPropertyChangeCallback<T = unknown> = (
  value: T,
  contextTime: ContextTime,
) => void;

export enum TransportState {
  playing = "playing",
  stopped = "stopped",
  paused = "paused",
}

export type TransportParams = {
  onStart: (ticks: ContextTime) => void;
  onStop: (ticks: ContextTime) => void;
};

/**
 * This class converts (music) transport time into audio clock time.
 */
export class Transport {
  private _initialized = false;

  private context: Readonly<Context>;
  private clock: Readonly<Clock>;
  private timer: Readonly<Timer>;
  private scheduler: Readonly<Scheduler<SourceEvent>>;

  private _timeSignature: TimeSignature = [4, 4];

  private tempo: Readonly<Tempo> = new Tempo();
  private clockTime = 0;
  private _swingAmount: NormalRange = 0.5;

  private sourceManager: SourceManager;

  private _clockCallbacks: TransportClockCallback[] = [];
  private _propertyChangeCallbacks = new Map<
    TransportProperty,
    TransportPropertyChangeCallback[]
  >();

  private onStartCallback: TransportParams["onStart"];
  private onStopCallback: TransportParams["onStop"];

  constructor(context: Readonly<Context>, params: TransportParams) {
    // ### Make these adapt to performance of app? Or let user set them?
    const SCHEDULE_INTERVAL_MS = 20;
    const SCHEDULE_WINDOW_SIZE_MS = 200;

    this.context = context;
    this.sourceManager = new SourceManager();
    this.clock = new Clock(this.context, SCHEDULE_WINDOW_SIZE_MS / 1000);
    this.onStartCallback = params.onStart;
    this.onStopCallback = params.onStop;

    this.scheduler = new Scheduler<SourceEvent>(
      this.generateEvents,
      this.consumeEvents,
      SCHEDULE_WINDOW_SIZE_MS / 1000,
    );

    this.timer = new Timer(() => {
      const time = this.clock.time();
      const contextTime = this.clock.clockTimeToContextTime(time);
      const ticks = this.tempo.getTicks(time);
      if (time <= this.clockTime) return;

      this.clockTime = time;
      this.scheduler.runUntil(time);
      this._clockCallbacks.forEach((callback) => {
        callback(this.clockTime, contextTime, ticks);
      });
    }, SCHEDULE_INTERVAL_MS / 1000);

    this._initialized = true;
  }

  addClockCallback(callback: TransportClockCallback) {
    this._clockCallbacks.push(callback);
  }

  addPropertyChangeCallback(
    property: TransportProperty,
    callback: TransportPropertyChangeCallback,
  ) {
    if (!this._propertyChangeCallbacks.has(property)) {
      this._propertyChangeCallbacks.set(property, []);
    }
    this._propertyChangeCallbacks.get(property)!.push(callback);
  }

  private triggerPropertyChange(property: TransportProperty, value: unknown) {
    const callbacks = this._propertyChangeCallbacks.get(property);
    if (callbacks) {
      const contextTime = this.context.currentTime;
      callbacks.forEach((callback) => {
        callback(value, contextTime);
      });
    }
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

    this.sourceManager.onStart(actionAt);
    this.clock.start(actionAt);
    this.timer.start();
    this.onStartCallback(actionAt);
  }

  /**
   * Stop the Transport.
   */
  stop() {
    if (!this._initialized) throw new Error("Not initialized");

    const actionAt = this.context.currentTime;

    this.sourceManager.onSilence(actionAt);
    this.sourceManager.onStop(actionAt);
    this.clock.stop(actionAt);
    this.timer.stop();
    this.onStopCallback(actionAt);
  }

  /**
   * Reset the Transport to zero.
   */
  reset() {
    if (!this._initialized) throw new Error("Not initialized");

    const actionAt = this.context.currentTime;
    this.sourceManager.onSilence(actionAt);
    this.jumpTo(0);
  }

  get bpm(): BPM {
    return this.tempo.bpm;
  }

  set bpm(bpm: BPM) {
    const oldBpm = this.tempo.bpm;
    this.tempo.update(this.clockTime, bpm);

    // Trigger property change callbacks if BPM actually changed
    if (oldBpm !== bpm) {
      this.triggerPropertyChange("bpm", bpm);
    }
  }

  get timeSignature() {
    return this._timeSignature;
  }

  set timeSignature(value: TimeSignature) {
    const oldValue = this._timeSignature;
    this._timeSignature = value;

    // Trigger property change callbacks if time signature actually changed
    if (oldValue[0] !== value[0] || oldValue[1] !== value[1]) {
      this.triggerPropertyChange("timeSignature", value);
    }
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
    const oldValue = this._swingAmount;
    this._swingAmount = amount;

    // Trigger property change callbacks if swing amount actually changed
    if (oldValue !== amount) {
      this.triggerPropertyChange("swingAmount", amount);
    }
  }

  private jumpTo(ticks: Ticks) {
    const clockTime = this.tempo.getClockTime(ticks);
    this.tempo.reset(clockTime, ticks);
    this.clock.jumpTo(clockTime);
    this.scheduler.jumpTo(clockTime);
    this.clockTime = clockTime;
    this.sourceManager.onJump(ticks);

    const contextTime = this.clock.clockTimeToContextTime(this.clockTime);
    this._clockCallbacks.forEach((callback) => {
      callback(this.clockTime, contextTime, ticks);
    });
  }

  private generateEvents = (
    start: ClockTime,
    end: ClockTime,
  ): readonly SourceEvent[] => {
    // Get transport-time events and return them as clock-time events
    const transportStart = this.tempo.getTicks(start);
    const transportEnd = this.tempo.getTicks(end);
    return this.sourceManager
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

  private consumeEvents = (events: readonly SourceEvent[]) => {
    this.sourceManager.consumer(events);
  };
}
