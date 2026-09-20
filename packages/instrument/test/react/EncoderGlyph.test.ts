import { describe, expect, it } from "vitest";
import { createEncoderArcPath } from "@/react/EncoderGlyph";

describe("createEncoderArcPath", () => {
  // Anchoring at the zero position (0.5 for a bipolar -1..1 range) makes the arc
  // fill as a band from center toward the value, not from the min end.
  it("fills from the anchor toward the value for bipolar ranges", () => {
    const start = createEncoderPoint(0.5); // center: 135 + 0.5*270 = 270deg
    const value = createEncoderPoint(0.75); // 135 + 0.75*270 = 337.5deg

    const path = createEncoderArcPath(0.75, 0.5);

    expect(path.startsWith(`M ${start.x} ${start.y}`)).toBe(true);
    expect(path.endsWith(`${value.x} ${value.y}`)).toBe(true);
  });

  it("fills backward when the value is below the anchor", () => {
    const forward = createEncoderArcPath(0.75, 0.5);
    const backward = createEncoderArcPath(0.25, 0.5);

    // Same span on the other side of center → different path, both non-empty.
    expect(backward).not.toBe("");
    expect(backward).not.toBe(forward);
  });

  it("matches legacy min-anchored behavior when anchor is 0", () => {
    expect(createEncoderArcPath(0, 0)).toBe("");
    expect(createEncoderArcPath(0.5, 0)).toContain("A 24 24 0 0 1");
  });
});

function createEncoderPoint(normalized: number) {
  const angle = ((135 + normalized * 270) * Math.PI) / 180;
  return {
    x: (32 + 24 * Math.cos(angle)).toFixed(2),
    y: (32 + 24 * Math.sin(angle)).toFixed(2),
  };
}
