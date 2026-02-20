import { describe, expect, it } from "vitest";
import { getNodeContainerClassName } from "../../src/components/Grid/AudioNode";

describe("AudioNode selected visibility", () => {
  it("applies prominent semantic highlight classes when selected", () => {
    const className = getNodeContainerClassName(true);

    expect(className).toContain("ring-4");
    expect(className).toContain("border-info");
    expect(className).toContain("shadow-2xl");
  });

  it("keeps neutral semantic border styles when not selected", () => {
    const className = getNodeContainerClassName(false);

    expect(className).toContain("border-border-subtle");
    expect(className).not.toContain("border-info");
    expect(className).not.toContain("ring-4");
  });
});
