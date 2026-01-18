import { describe, expect, test } from "vitest";
import { expandPatternSequence } from "../src/utils/patternSequence";

describe("expandPatternSequence", () => {
  test("expands simple pattern sequence", () => {
    const result = expandPatternSequence("ABC");
    expect(result).toEqual(["A", "B", "C"]);
  });

  test("expands pattern with count prefix", () => {
    const result = expandPatternSequence("2A3B");
    expect(result).toEqual(["A", "A", "B", "B", "B"]);
  });

  test("expands complex pattern sequence", () => {
    const result = expandPatternSequence("2A4B2AC");
    expect(result).toEqual(["A", "A", "B", "B", "B", "B", "A", "A", "C"]);
  });

  test("handles single pattern without count", () => {
    const result = expandPatternSequence("A");
    expect(result).toEqual(["A"]);
  });

  test("handles empty string", () => {
    const result = expandPatternSequence("");
    expect(result).toEqual([]);
  });
});
