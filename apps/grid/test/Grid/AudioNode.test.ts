import { describe, expect, it } from "vitest";
import { getNodeContainerStyleProps } from "../../src/components/Grid/AudioNode";

describe("AudioNode selected visibility", () => {
  it("applies prominent highlight styles when selected", () => {
    const styleProps = getNodeContainerStyleProps(true);

    expect(styleProps).toMatchObject({
      borderColor: "cyan.500",
      ring: "4px",
      boxShadow: "2xl",
    });
  });

  it("keeps neutral border styles when not selected", () => {
    const styleProps = getNodeContainerStyleProps(false);

    expect(styleProps).toMatchObject({
      borderColor: "border",
      boxShadow: "lg",
    });
    expect(styleProps).not.toHaveProperty("ring");
  });
});
