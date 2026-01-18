import { describe, expect, test } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { TPB } from "../src/utils";
import {
  createTestConfig,
  createTestPattern,
} from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Generator", () => {
  test("generator returns empty array when not running", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const events = sequencer.generator(0, TPB);

    expect(events).toEqual([]);
  });

  test("generator creates events for active steps", () => {
    const pattern = createTestPattern({
      activeSteps: [0, 4, 8, 12],
      notes: [{ note: "C4", velocity: 100 }],
    });
    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB);

    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(event.step.notes).toEqual([{ note: "C4", velocity: 100 }]);
    });
  });

  test("generator filters inactive steps", () => {
    const pattern = createTestPattern({ activeSteps: [] });
    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB * 4);

    expect(events).toEqual([]);
  });

  test("generator filters by probability", () => {
    const pattern = createTestPattern({
      activeSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    });

    // Test boundary conditions
    // Hash values: 0:0, 1:61, 2:22, 3:83, 4:44, 5:5, 6:66, 7:27, 8:88
    // Condition: if (hash > probability) skip

    // probability = 100: all should fire (0 > 100? No)
    pattern.pages[0].steps[0].probability = 100;
    pattern.pages[0].steps[1].probability = 100;

    // probability = 50: depends on hash
    pattern.pages[0].steps[2].probability = 50; // hash=22, 22>50? No, fires
    pattern.pages[0].steps[3].probability = 50; // hash=83, 83>50? Yes, skips

    // probability = 0: most will skip except hash=0
    pattern.pages[0].steps[4].probability = 1; // hash=44, 44>1? Yes, skips
    pattern.pages[0].steps[5].probability = 1; // hash=5, 5>1? Yes, skips

    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB * 2);

    const stepIndexes = events.map((e) => e.stepIndex);

    // 100% probability: should always fire
    expect(stepIndexes).toContain(0);
    expect(stepIndexes).toContain(1);

    // 50% probability with hash behavior
    expect(stepIndexes).toContain(2); // hash 22 <= 50
    expect(stepIndexes).not.toContain(3); // hash 83 > 50

    // 1% probability with hash behavior
    expect(stepIndexes).not.toContain(4); // hash 44 > 1
    expect(stepIndexes).not.toContain(5); // hash 5 > 1
  });

  test("generator applies microtiming offset", () => {
    const pattern = createTestPattern({ activeSteps: [0] });
    pattern.pages[0].steps[0].microtimeOffset = 50;

    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB);

    expect(events.length).toBe(1);
    // Event should be offset from step 0
    expect(events[0].ticks).toBeGreaterThan(0);
  });

  test("generator respects resolution setting", () => {
    const pattern = createTestPattern({ activeSteps: [0, 1, 2, 3] });
    const config = createTestConfig({
      patterns: [pattern],
      resolution: "1/8", // Eighth notes
    });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB * 2); // 2 beats

    // With 1/8 resolution, 2 beats = 4 eighth notes
    // All 4 active steps should fire
    expect(events.length).toBe(4);
  });

  test("generator is idempotent with overlapping windows", () => {
    const pattern = createTestPattern({ activeSteps: [0, 4, 8, 12] });
    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    // First call
    const events1 = sequencer.generator(0, TPB * 2);

    // Second call with same window - should return identical events
    const events2 = sequencer.generator(0, TPB * 2);

    expect(events1.length).toBe(events2.length);
    expect(events1.length).toBeGreaterThan(0);

    // Verify events are identical
    events1.forEach((event, i) => {
      expect(event.ticks).toBe(events2[i].ticks);
      expect(event.patternIndex).toBe(events2[i].patternIndex);
      expect(event.stepIndex).toBe(events2[i].stepIndex);
    });
  });
});
