import { now } from ".";
import Scheduler from "./Scheduler";
import Time, { t, TTime } from "./Time";

export enum TransportState {
  playing = "playing",
  stopped = "stopped",
  paused = "paused",
}

export type TransportEvents = {
  start: { actionAt: TTime; offset: TTime };
  stop: { actionAt: TTime };
  pause: { actionAt: TTime };
};

type TPlaybackCallback = (actionAt: TTime) => void;

type TransportProps = {
  onStart?: TPlaybackCallback;
  onStop?: TPlaybackCallback;
};

export default class Transport {
  bpm = 120;
  timeSignature: [number, number] = [4, 4];
  loopStart: TTime;
  loopEnd?: TTime;

  state: TransportState = TransportState.stopped;
  offset: TTime = 0;

  private startTime: TTime = 0;
  private onStart: TransportProps["onStart"];
  private onStop: TransportProps["onStop"];
  private scheduler: Scheduler;

  constructor(props: TransportProps) {
    this.onStart = props.onStart;
    this.onStop = props.onStop;
    this.loopStart = t("0:0:0");
    this.scheduler = new Scheduler(this);
  }

  start({
    offset = this.offset,
    actionAt = now(),
  }: {
    offset?: TTime;
    actionAt?: TTime;
  }) {
    if (this.state === TransportState.playing) return;

    this.validateFutureTime(actionAt);

    this.scheduler.start(actionAt, () => {
      this.state = TransportState.playing;
      this.offset = offset;
      this.startTime = t(actionAt).subtract(this.offset);
    });
    this.onStart?.(actionAt);

    return actionAt;
  }

  stop({ actionAt: actionAt = now() }: { actionAt?: TTime }) {
    if (this.state === TransportState.stopped) return;

    this.validateFutureTime(actionAt);

    this.scheduler.stop(actionAt, () => {
      this.state = TransportState.stopped;
      this.offset = 0;
    });
    this.onStop?.(actionAt);

    return actionAt;
  }

  pause({ actionAt: actionAt = now() }: { actionAt?: TTime }) {
    if (this.state === TransportState.paused) return;

    this.validateFutureTime(actionAt);

    this.scheduler.stop(actionAt, () => {
      this.state = TransportState.paused;
      this.offset = t(actionAt).subtract(this.startTime);
    });
    this.onStop?.(actionAt);

    return actionAt;
  }

  get playhead(): Time {
    if (this.state === TransportState.stopped) return t(0);
    if (this.state === TransportState.paused) return t(this.offset);

    return t(now()).subtract(this.startTime);
  }

  private validateFutureTime(time: TTime) {
    if (t(time).isBefore(now())) throw Error("Past time not allowed");
  }
}
