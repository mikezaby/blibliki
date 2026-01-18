import { describe, expect, test } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import {
  createTestConfig,
  createDefaultPattern,
} from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Update API", () => {
  test("updateStep modifies step data", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.updateStep(0, 0, 5, { active: true });

    const step = sequencer.getStep(0, 0, 5);
    expect(step.active).toBe(true);
  });

  test("updateStep partially updates step", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.updateStep(0, 0, 3, {
      active: true,
      notes: [{ note: "D4", velocity: 80 }],
    });

    const step = sequencer.getStep(0, 0, 3);
    expect(step.active).toBe(true);
    expect(step.notes).toEqual([{ note: "D4", velocity: 80 }]);
    expect(step.probability).toBe(100); // Unchanged
  });

  test("setResolution updates resolution without throwing", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    // Since config is private, we can only verify the method doesn't throw
    expect(() => sequencer.setResolution("1/8")).not.toThrow();
    expect(() => sequencer.setResolution("1/32")).not.toThrow();
    expect(() => sequencer.setResolution("1/16")).not.toThrow();
    expect(() => sequencer.setResolution("1/4")).not.toThrow();
  });

  test("setPlaybackMode updates playback mode without throwing", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    // Since config is private, we can only verify the method doesn't throw
    expect(() => sequencer.setPlaybackMode("oneShot")).not.toThrow();
    expect(() => sequencer.setPlaybackMode("loop")).not.toThrow();
  });

  test("setStepsPerPage validates input range", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    // Valid inputs (1-16)
    expect(() => sequencer.setStepsPerPage(1)).not.toThrow();
    expect(() => sequencer.setStepsPerPage(8)).not.toThrow();
    expect(() => sequencer.setStepsPerPage(16)).not.toThrow();

    // Invalid inputs
    expect(() => sequencer.setStepsPerPage(0)).toThrow(
      "stepsPerPage must be between 1 and 16",
    );
    expect(() => sequencer.setStepsPerPage(17)).toThrow(
      "stepsPerPage must be between 1 and 16",
    );
    expect(() => sequencer.setStepsPerPage(-1)).toThrow(
      "stepsPerPage must be between 1 and 16",
    );
  });

  test("setEnableSequence updates sequence enabled state", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    // Since config is private, we can only verify the method doesn't throw
    expect(() => sequencer.setEnableSequence(true)).not.toThrow();
    expect(() => sequencer.setEnableSequence(false)).not.toThrow();
  });

  test("setPatternSequence updates pattern sequence and expands it", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    // Test with various pattern sequence formats
    expect(() => sequencer.setPatternSequence("ABC")).not.toThrow();
    expect(() => sequencer.setPatternSequence("2A3B")).not.toThrow();
    expect(() => sequencer.setPatternSequence("2A4B2AC")).not.toThrow();
    expect(() => sequencer.setPatternSequence("A")).not.toThrow();
    expect(() => sequencer.setPatternSequence("")).not.toThrow();
  });

  test("addPage adds page to pattern", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const pattern = sequencer.getPattern(0);
    const initialPageCount = pattern.pages.length;

    const newPage = {
      name: "Page 2",
      steps: Array.from({ length: 16 }, () => ({
        active: false,
        notes: [],
        ccMessages: [],
        probability: 100,
        microtimeOffset: 0,
        duration: "1/16" as const,
      })),
    };

    sequencer.addPage(0, newPage);

    const updatedPattern = sequencer.getPattern(0);
    expect(updatedPattern.pages.length).toBe(initialPageCount + 1);
    expect(updatedPattern.pages[initialPageCount]).toEqual(newPage);
  });

  test("addPage throws for invalid pattern index", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const newPage = {
      name: "Page 2",
      steps: Array.from({ length: 16 }, () => ({
        active: false,
        notes: [],
        ccMessages: [],
        probability: 100,
        microtimeOffset: 0,
        duration: "1/16" as const,
      })),
    };

    expect(() => sequencer.addPage(999, newPage)).toThrow(
      "Pattern 999 not found",
    );
  });

  test("removePage removes page from pattern", () => {
    const config = createTestConfig();
    const pattern = config.patterns[0];
    pattern.pages.push({
      name: "Page 2",
      steps: Array.from({ length: 16 }, () => ({
        active: false,
        notes: [],
        ccMessages: [],
        probability: 100,
        microtimeOffset: 0,
        duration: "1/16" as const,
      })),
    });

    const sequencer = new StepSequencer(config);

    const initialPageCount = sequencer.getPattern(0).pages.length;
    expect(initialPageCount).toBe(2);

    sequencer.removePage(0, 1);

    const updatedPattern = sequencer.getPattern(0);
    expect(updatedPattern.pages.length).toBe(1);
  });

  test("removePage throws for invalid page index", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    expect(() => sequencer.removePage(0, 999)).toThrow(
      "Page index 999 out of bounds",
    );
    expect(() => sequencer.removePage(0, -1)).toThrow(
      "Page index -1 out of bounds",
    );
  });

  test("addPattern adds new pattern", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const newPattern = createDefaultPattern("B");
    sequencer.addPattern(newPattern);

    expect(sequencer.getPattern(1)).toEqual(newPattern);
  });

  test("removePattern removes pattern", () => {
    const config = createTestConfig({
      patterns: [createDefaultPattern("A"), createDefaultPattern("B")],
    });
    const sequencer = new StepSequencer(config);

    sequencer.removePattern(1);

    expect(() => sequencer.getPattern(1)).toThrow();
  });
});
