// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isInstrumentDebugPath,
  isInstrumentPerformancePath,
  isInstrumentPerformanceRoutePath,
} from "../../src/routes/-instrumentRoutePath";

describe("isInstrumentDebugPath", () => {
  it("returns true for the instrument debug url", () => {
    expect(
      isInstrumentDebugPath("/instrument/instrument-1/debug", "instrument-1"),
    ).toBe(true);
  });

  it("returns false for the normal instrument editor url", () => {
    expect(
      isInstrumentDebugPath("/instrument/instrument-1", "instrument-1"),
    ).toBe(false);
  });
});

describe("isInstrumentPerformancePath", () => {
  it("returns true for the instrument performance url", () => {
    expect(
      isInstrumentPerformancePath(
        "/instrument/instrument-1/performance",
        "instrument-1",
      ),
    ).toBe(true);
  });

  it("returns false for the normal instrument editor url", () => {
    expect(
      isInstrumentPerformancePath("/instrument/instrument-1", "instrument-1"),
    ).toBe(false);
  });
});

describe("isInstrumentPerformanceRoutePath", () => {
  it("returns true for plain performance layout urls", () => {
    expect(
      isInstrumentPerformanceRoutePath("/instrument/instrument-1/performance"),
    ).toBe(true);
  });

  it("returns false for non-performance instrument urls", () => {
    expect(isInstrumentPerformanceRoutePath("/instrument/instrument-1")).toBe(
      false,
    );
  });
});
