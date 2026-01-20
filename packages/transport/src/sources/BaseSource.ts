import { uuidv4 } from "@blibliki/utils";
import { Transport, TransportEvent } from "@/Transport";
import { Ticks } from "@/types";

export interface SourceEvent extends TransportEvent {
  eventSourceId: string;
}

export interface IBaseSource<T extends SourceEvent> {
  id: string;

  generator: (start: Ticks, end: Ticks) => readonly Readonly<T>[];
  consumer: (event: Readonly<T>) => void;

  // Optional lifecycle hooks
  onStart: (ticks: Ticks) => void;
  onStop: (ticks: Ticks) => void;
  onJump: (ticks: Ticks) => void;
  onSilence: (ticks: Ticks) => void;
}

export abstract class BaseSource<
  T extends SourceEvent,
> implements IBaseSource<T> {
  readonly id: string;

  protected transport: Transport;
  protected startedAt?: Ticks;
  protected stoppedAt?: Ticks;
  protected lastGeneratedTick?: Ticks;

  constructor(transport: Transport) {
    this.id = uuidv4();
    this.transport = transport;
  }

  abstract generator(start: Ticks, end: Ticks): readonly Readonly<T>[];
  abstract consumer(event: Readonly<T>): void;

  onStart(ticks: Ticks) {
    this.startedAt = ticks;
    this.stoppedAt = undefined;
    this.lastGeneratedTick = undefined;
  }

  onStop(ticks: Ticks) {
    this.stoppedAt = ticks;
  }

  onJump(ticks: Ticks) {
    this.lastGeneratedTick = ticks;
  }

  onSilence(_ticks: Ticks) {
    // Not implemented yet
  }

  protected isPlaying(start: Ticks, end: Ticks) {
    const isStarted = this.startedAt !== undefined && this.startedAt <= start;
    if (!isStarted) return false;

    return this.stoppedAt === undefined || this.stoppedAt >= end;
  }

  protected shouldGenerate(eventTick: Ticks): boolean {
    if (this.lastGeneratedTick === undefined) return true;

    return eventTick > this.lastGeneratedTick;
  }
}
