import { describe, expect, it } from "vitest";
import { divisionToMilliseconds, Division, TPB } from "../src/utils";

describe("divisionToMilliseconds", () => {
  const bpm = 120; // 120 BPM = 2 beats per second = 0.5 seconds per beat

  describe("basic divisions", () => {
    it("should calculate 1/4 note duration correctly", () => {
      // At 120 BPM: 1 beat = 0.5 seconds = 500ms
      const result = divisionToMilliseconds("1/4", bpm);
      expect(result).toBe(500);
    });

    it("should calculate 1/8 note duration correctly", () => {
      // At 120 BPM: 1/2 beat = 0.25 seconds = 250ms
      const result = divisionToMilliseconds("1/8", bpm);
      expect(result).toBe(250);
    });

    it("should calculate 1/16 note duration correctly", () => {
      // At 120 BPM: 1/4 beat = 0.125 seconds = 125ms
      const result = divisionToMilliseconds("1/16", bpm);
      expect(result).toBe(125);
    });

    it("should calculate 1/32 note duration correctly", () => {
      // At 120 BPM: 1/8 beat = 0.0625 seconds = 62.5ms
      const result = divisionToMilliseconds("1/32", bpm);
      expect(result).toBe(62.5);
    });

    it("should calculate 1/2 note duration correctly", () => {
      // At 120 BPM: 2 beats = 1 second = 1000ms
      const result = divisionToMilliseconds("1/2", bpm);
      expect(result).toBe(1000);
    });

    it("should calculate 1 bar duration correctly", () => {
      // At 120 BPM: 4 beats = 2 seconds = 2000ms
      const result = divisionToMilliseconds("1", bpm);
      expect(result).toBe(2000);
    });
  });

  describe("different BPM values", () => {
    it("should calculate 1/4 note at 60 BPM", () => {
      // At 60 BPM: 1 beat = 1 second = 1000ms
      const result = divisionToMilliseconds("1/4", 60);
      expect(result).toBe(1000);
    });

    it("should calculate 1/4 note at 240 BPM", () => {
      // At 240 BPM: 1 beat = 0.25 seconds = 250ms
      const result = divisionToMilliseconds("1/4", 240);
      expect(result).toBe(250);
    });

    it("should calculate 1/16 note at 90 BPM", () => {
      // At 90 BPM: 1 beat = 60/90 = 0.666... seconds
      // 1/16 note = 1/4 beat = 0.166... seconds = 166.666...ms
      const result = divisionToMilliseconds("1/16", 90);
      expect(result).toBeCloseTo(166.66666666666666, 10);
    });
  });

  describe("precision verification", () => {
    it("should maintain precision across tick conversion", () => {
      const division: Division = "1/2";
      const bpm = 120;

      // Calculate using divisionToMilliseconds
      const milliseconds = divisionToMilliseconds(division, bpm);

      // Manual calculation for verification
      // 1/2 note = 2 beats
      // At 120 BPM: 2 beats = 1 second = 1000ms
      const expected = 1000;

      expect(milliseconds).toBe(expected);
    });

    it("should handle step sequencer use case: step 1 with 1/2 note, step 8 timing", () => {
      const bpm = 120;
      const stepResolution = "1/16" as Division;
      const noteDuration = "1/2" as Division;

      // Calculate step resolution in milliseconds
      const stepMs = divisionToMilliseconds(stepResolution, bpm);

      // Calculate note duration in milliseconds
      const noteDurationMs = divisionToMilliseconds(noteDuration, bpm);

      // Step 1 triggers at step 0
      // Step 8 triggers at step 7 (0-indexed)
      const step8TriggerTime = stepMs * 7;

      // Note-off from step 1 should fire at
      const noteOffTime = noteDurationMs;

      // At 120 BPM:
      // stepMs = 125ms (1/16 note)
      // noteDurationMs = 1000ms (1/2 note)
      // step8TriggerTime = 875ms (7 * 125ms)
      // noteOffTime = 1000ms

      expect(stepMs).toBe(125);
      expect(noteDurationMs).toBe(1000);
      expect(step8TriggerTime).toBe(875);
      expect(noteOffTime).toBeGreaterThan(step8TriggerTime);

      // The note-off (1000ms) comes AFTER step 8 trigger (875ms)
      // This is the problem: note-off kills the retriggered note
      expect(noteOffTime - step8TriggerTime).toBe(125);
    });
  });

  describe("special cases", () => {
    it("should return Infinity for infinity division", () => {
      const result = divisionToMilliseconds("infinity", bpm);
      expect(result).toBe(Infinity);
    });

    it("should handle triplet divisions", () => {
      // 1/12 note = 1/3 of a beat
      const result = divisionToMilliseconds("1/12", bpm);
      // At 120 BPM: 1/3 beat = 0.166... seconds = 166.666...ms
      expect(result).toBeCloseTo(166.66666666666666, 10);
    });

    it("should handle dotted notes", () => {
      // 3/16 note = 3/4 of a beat
      const result = divisionToMilliseconds("3/16", bpm);
      // At 120 BPM: 3/4 beat = 0.375 seconds = 375ms
      expect(result).toBe(375);
    });
  });

  describe("internal consistency", () => {
    it("two 1/8 notes should equal one 1/4 note", () => {
      const eighth = divisionToMilliseconds("1/8", bpm);
      const quarter = divisionToMilliseconds("1/4", bpm);

      expect(eighth * 2).toBe(quarter);
    });

    it("four 1/16 notes should equal one 1/4 note", () => {
      const sixteenth = divisionToMilliseconds("1/16", bpm);
      const quarter = divisionToMilliseconds("1/4", bpm);

      expect(sixteenth * 4).toBe(quarter);
    });

    it("eight 1/16 notes should equal one 1/2 note", () => {
      const sixteenth = divisionToMilliseconds("1/16", bpm);
      const half = divisionToMilliseconds("1/2", bpm);

      expect(sixteenth * 8).toBe(half);
    });
  });
});
