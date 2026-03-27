import { describe, expect, it, vi } from "vitest";
import {
  StepSequencerSource,
  IPattern,
  Resolution,
  PlaybackMode,
} from "../src/sources/StepSequencerSource";
import { TPB } from "../src/utils";

describe("StepSequencerSource", () => {
  // Create a minimal mock transport with just the required properties
  const createMockTransport = () =>
    ({
      timeSignature: [4, 4] as [number, number],
    }) as any;

  describe("event generation with overlapping ranges", () => {
    it("should not generate duplicate events when generator is called with overlapping tick ranges", () => {
      // Create a simple pattern with 1 page and 4 steps
      const patterns: IPattern[] = [
        {
          name: "A",
          pages: [
            {
              name: "Page 1",
              steps: [
                {
                  active: true,
                  notes: [{ note: "C4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
                {
                  active: true,
                  notes: [{ note: "D4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
                {
                  active: true,
                  notes: [{ note: "E4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
                {
                  active: true,
                  notes: [{ note: "F4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
              ],
            },
          ],
        },
      ];

      const onEvent = vi.fn();
      const transport = createMockTransport();

      // Create source with 4 steps per page, 1/16 resolution
      const source = new StepSequencerSource(transport, {
        onEvent,
        patterns,
        stepsPerPage: 4,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        patternSequence: "1A",
        enableSequence: true,
      });

      // Start at tick 0
      source.onStart(0);

      // Generate events for first range: 0 to TPB (one quarter note = 4 steps at 1/16)
      const events1 = source.generator(0, TPB);
      const ticks1 = events1.map((e) => e.ticks);

      // Generate events for overlapping range: 0 to TPB again
      // This simulates what happens when the pattern loops back
      const events2 = source.generator(0, TPB);
      const ticks2 = events2.map((e) => e.ticks);

      console.log("First generation ticks:", ticks1);
      console.log("Second generation ticks:", ticks2);

      // The second generation should return empty array because we already generated those ticks
      expect(
        ticks2.length,
        `Expected 0 events on second generation, but got ${ticks2.length} events with ticks: ${ticks2.join(", ")}`,
      ).toBe(0);
    });

    it("should track lastGeneratedTick correctly with partial overlaps", () => {
      // Create a minimal pattern
      const patterns: IPattern[] = [
        {
          name: "A",
          pages: [
            {
              name: "Page 1",
              steps: [
                {
                  active: true,
                  notes: [{ note: "C4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
              ],
            },
          ],
        },
      ];

      const onEvent = vi.fn();
      const transport = createMockTransport();

      const source = new StepSequencerSource(transport, {
        onEvent,
        patterns,
        stepsPerPage: 1,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        patternSequence: "1A",
        enableSequence: true,
      });

      // Start at tick 0
      source.onStart(0);

      // Generate events for range 0 to TPB/2
      const events1 = source.generator(0, TPB / 2);
      const ticks1 = events1.map((e) => e.ticks);

      // Generate events for overlapping range TPB/4 to TPB
      // This should only return events for ticks > TPB/2
      const events2 = source.generator(TPB / 4, TPB);
      const ticks2 = events2.map((e) => e.ticks);

      console.log("First generation ticks:", ticks1);
      console.log("Second generation ticks:", ticks2);

      // The second generation should only include ticks > TPB/2 (the last generated tick)
      for (const tick of ticks2) {
        expect(
          tick,
          `Expected all ticks in second generation to be > ${TPB / 2}, but got ${tick}`,
        ).toBeGreaterThan(TPB / 2);
      }
    });
  });

  describe("pattern sequence expansion", () => {
    it("treats bare pattern letters as a single repeat in sequence mode", () => {
      const patterns: IPattern[] = [
        {
          name: "A",
          pages: [
            {
              name: "Page 1",
              steps: [
                {
                  active: true,
                  notes: [{ note: "C4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
              ],
            },
          ],
        },
        {
          name: "C",
          pages: [
            {
              name: "Page 1",
              steps: [
                {
                  active: true,
                  notes: [{ note: "G4", velocity: 100 }],
                  ccMessages: [],
                  probability: 100,
                  microtimeOffset: 0,
                  duration: "1/16",
                },
              ],
            },
          ],
        },
      ];

      const source = new StepSequencerSource(createMockTransport(), {
        onEvent: vi.fn(),
        patterns,
        loopLength: 1,
        stepsPerPage: 1,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        patternSequence: "2AC",
        enableSequence: true,
      });

      source.onStart(0);

      const events = source.generator(0, TPB - 1);

      expect(events).toHaveLength(4);
      expect(events.slice(0, 3).map((event) => event.patternNo)).toEqual([
        0, 0, 1,
      ]);
      expect(
        events.slice(0, 3).map((event) => event.step.notes[0]?.note),
      ).toEqual(["C4", "C4", "G4"]);
    });

    it("plays every page of each referenced pattern even when patterns have different page counts", () => {
      const makeStep = (note: string) => ({
        active: true,
        notes: [{ note, velocity: 100 }],
        ccMessages: [],
        probability: 100,
        microtimeOffset: 0,
        duration: "1/16" as const,
      });

      const patterns: IPattern[] = [
        {
          name: "A",
          pages: [
            { name: "A1", steps: [makeStep("C4")] },
            { name: "A2", steps: [makeStep("D4")] },
          ],
        },
        {
          name: "B",
          pages: [
            { name: "B1", steps: [makeStep("E4")] },
            { name: "B2", steps: [makeStep("F4")] },
            { name: "B3", steps: [makeStep("G4")] },
          ],
        },
      ];

      const source = new StepSequencerSource(createMockTransport(), {
        onEvent: vi.fn(),
        patterns,
        loopLength: 1,
        stepsPerPage: 1,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        patternSequence: "AB",
        enableSequence: true,
      });

      source.onStart(0);

      const events = source.generator(0, TPB + TPB / 4 - 1);

      expect(events.map((event) => [event.patternNo, event.pageNo])).toEqual([
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
        [1, 2],
      ]);
      expect(events.map((event) => event.step.notes[0]?.note)).toEqual([
        "C4",
        "D4",
        "E4",
        "F4",
        "G4",
      ]);
    });
  });
});
