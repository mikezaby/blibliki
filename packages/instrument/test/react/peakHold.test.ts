import { describe, expect, it } from "vitest";
import { advancePeakHold } from "@/react/peakHold";

describe("advancePeakHold", () => {
  it("rises to a new peak at once", () => {
    expect(advancePeakHold({ level: 0.2, since: 0 }, 0.8, 100, 1000)).toEqual({
      level: 0.8,
      since: 100,
    });
  });

  it("holds the peak while the level drops inside the window", () => {
    const held = { level: 0.8, since: 100 };

    expect(advancePeakHold(held, 0.3, 900, 1000)).toBe(held);
  });

  it("follows the level once the window has passed", () => {
    expect(
      advancePeakHold({ level: 0.8, since: 100 }, 0.3, 1100, 1000),
    ).toEqual({ level: 0.3, since: 1100 });
  });
});
