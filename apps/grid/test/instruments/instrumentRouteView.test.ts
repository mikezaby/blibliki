// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isInstrumentDebugPath } from "../../src/routes/instrument.$instrumentId";

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
