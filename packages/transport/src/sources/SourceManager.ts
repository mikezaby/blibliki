import { Ticks } from "@/types";
import type { BaseSource, SourceEvent } from "./BaseSource";

export class SourceManager {
  private activeSources = new Map<string, BaseSource<SourceEvent>>();

  addSource<T extends SourceEvent>(source: BaseSource<T>) {
    this.activeSources.set(source.id, source);
  }

  removeSource(id: string) {
    this.activeSources.delete(id);
  }

  generator(start: Ticks, end: Ticks): readonly SourceEvent[] {
    const events: SourceEvent[] = [];

    this.activeSources.forEach((source) => {
      events.push(...(source.generator(start, end) as SourceEvent[]));
    });

    return events;
  }

  consumer(events: readonly SourceEvent[]) {
    events.forEach((event) => {
      this.activeSources.get(event.eventSourceId)?.consumer(event);
    });
  }

  onStart(ticks: Ticks) {
    this.activeSources.forEach((source) => {
      source.onStart(ticks);
    });
  }

  onStop(ticks: Ticks) {
    this.activeSources.forEach((source) => {
      source.onStop(ticks);
    });
  }

  onJump(ticks: Ticks) {
    this.activeSources.forEach((source) => {
      source.onJump(ticks);
    });
  }

  onSilence(ticks: Ticks) {
    this.activeSources.forEach((source) => {
      source.onSilence(ticks);
    });
  }
}
