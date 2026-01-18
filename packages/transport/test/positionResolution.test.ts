import { describe, expect, test } from "vitest";
import { resolveStepPosition } from "../src/utils/positionResolution";
import { createTestPattern } from "./helpers/stepSequencerHelpers";

describe("resolveStepPosition", () => {
  test("resolves position for single-page pattern", () => {
    const patterns = [createTestPattern({ name: "A", steps: 16 })];
    const result = resolveStepPosition(0, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 0,
      stepIndex: 0,
    });
  });

  test("resolves position at step 5", () => {
    const patterns = [createTestPattern({ name: "A", steps: 16 })];
    const result = resolveStepPosition(5, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 0,
      stepIndex: 5,
    });
  });

  test("resolves position across pages", () => {
    const pattern = createTestPattern({ name: "A" });
    pattern.pages.push({
      name: "Page 2",
      steps: Array(16)
        .fill(null)
        .map(() => ({
          active: false,
          notes: [],
          ccMessages: [],
          probability: 100,
          microtimeOffset: 0,
          duration: "1/16" as const,
        })),
    });
    const patterns = [pattern];

    const result = resolveStepPosition(20, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 1,
      stepIndex: 4,
    });
  });

  test("wraps around at pattern end", () => {
    const patterns = [createTestPattern({ name: "A", steps: 16 })];
    const result = resolveStepPosition(32, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 0,
      stepIndex: 0,
    });
  });

  test("resolves with sequence mode enabled", () => {
    const patterns = [
      createTestPattern({ name: "A", steps: 16 }),
      createTestPattern({ name: "B", steps: 16 }),
    ];
    const expandedSequence = ["A", "B"];
    let sequencePatternCount = 1;

    const result = resolveStepPosition(
      0,
      patterns,
      0,
      16,
      true,
      expandedSequence,
      sequencePatternCount,
    );

    expect(result.patternIndex).toBe(1); // Should be pattern B
  });
});
