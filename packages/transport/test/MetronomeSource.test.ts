import { describe, expect, it } from "vitest";
import type { Transport } from "../src/Transport";
import { MetronomeSource } from "../src/sources/MetronomeSource";
import type { MetronomeSourceEvent } from "../src/sources/MetronomeSource";
import { TPB } from "../src/utils";

describe("MetronomeSource", () => {
  it("emits one event per beat, marks the downbeat, and never repeats a beat", () => {
    const transport = { timeSignature: [4, 4] } as unknown as Transport;
    const consumed: MetronomeSourceEvent[] = [];
    const source = new MetronomeSource(transport, (event) => {
      consumed.push(event);
    });
    source.onStart(0);

    const firstBar = source.generator(0, 4 * TPB - 1);

    expect(firstBar.map((event) => [event.ticks / TPB, event.beat])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]);

    // The next window overlaps the last one and only yields new beats.
    const overlap = source.generator(3 * TPB, 6 * TPB);

    expect(overlap.map((event) => [event.ticks / TPB, event.beat])).toEqual([
      [4, 0],
      [5, 1],
      [6, 2],
    ]);

    source.consumer(overlap[0]!);

    expect(consumed).toEqual([overlap[0]]);
  });

  it("follows the time signature's beat", () => {
    const transport = { timeSignature: [6, 8] } as unknown as Transport;
    const source = new MetronomeSource(transport, () => undefined);
    source.onStart(0);

    const bar = source.generator(0, 3 * TPB - 1);

    expect(bar).toHaveLength(6);
    expect(bar.map((event) => event.beat)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(bar[1]?.ticks).toBe(TPB / 2);
  });
});
