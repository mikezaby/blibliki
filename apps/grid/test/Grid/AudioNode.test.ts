import { describe, expect, it } from "vitest";
import { getNodeContainerClassName } from "../../src/components/Grid/AudioNode";

describe("AudioNode selected visibility", () => {
  it("applies prominent highlight classes when selected", () => {
    const className = getNodeContainerClassName(true);

    expect(className).toContain("ring-4");
    expect(className).toContain("border-cyan-500");
    expect(className).toContain("shadow-2xl");
  });

  it("keeps neutral border styles when not selected", () => {
    const className = getNodeContainerClassName(false);

    expect(className).toContain("border-slate-200");
    expect(className).not.toContain("border-cyan-500");
    expect(className).not.toContain("ring-4");
  });
});
