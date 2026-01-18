import { describe, expect, test } from "vitest";
import { TPB } from "../src/utils";
import { calculateMicrotimingOffset } from "../src/utils/microtiming";

describe("calculateMicrotimingOffset", () => {
  test("returns 0 for zero offset", () => {
    const result = calculateMicrotimingOffset(0);
    expect(result).toBe(0);
  });

  test("calculates positive offset correctly", () => {
    const result = calculateMicrotimingOffset(50);
    const expected = 50 * (TPB / 4 / 100); // 50% of 1/16th note
    expect(result).toBe(expected);
  });

  test("calculates negative offset correctly", () => {
    const result = calculateMicrotimingOffset(-50);
    const expected = -50 * (TPB / 4 / 100);
    expect(result).toBe(expected);
  });

  test("handles max positive offset", () => {
    const result = calculateMicrotimingOffset(100);
    const expected = 100 * (TPB / 4 / 100);
    expect(result).toBe(expected);
  });

  test("handles max negative offset", () => {
    const result = calculateMicrotimingOffset(-100);
    const expected = -100 * (TPB / 4 / 100);
    expect(result).toBe(expected);
  });
});
