import { Transport } from "@/Transport";
import { Ticks } from "@/types";
import { TPB } from "@/utils";
import { BaseSource } from "./BaseSource";
import type { SourceEvent } from "./BaseSource";

export interface MetronomeSourceEvent extends SourceEvent {
  // The beat within its bar, 0 on the downbeat.
  beat: number;
}

// One event per beat of the transport's time signature, counted from tick 0.
export class MetronomeSource extends BaseSource<MetronomeSourceEvent> {
  constructor(
    transport: Transport,
    private readonly onEvent: (event: MetronomeSourceEvent) => void,
  ) {
    super(transport);
  }

  generator(
    start: Ticks,
    end: Ticks,
  ): readonly Readonly<MetronomeSourceEvent>[] {
    if (!this.isPlaying(start, end)) return [];

    const [beatsPerBar, denominator] = this.transport.timeSignature;
    const ticksPerBeat = (TPB * 4) / denominator;
    const events: MetronomeSourceEvent[] = [];

    for (
      let ticks = Math.ceil(start / ticksPerBeat) * ticksPerBeat;
      ticks <= end;
      ticks += ticksPerBeat
    ) {
      if (!this.shouldGenerate(ticks)) continue;

      this.lastGeneratedTick = ticks;
      events.push({
        ticks,
        time: 0,
        contextTime: 0,
        eventSourceId: this.id,
        beat: Math.round(ticks / ticksPerBeat) % beatsPerBar,
      });
    }

    return events;
  }

  consumer(event: Readonly<MetronomeSourceEvent>) {
    this.onEvent(event);
  }
}
