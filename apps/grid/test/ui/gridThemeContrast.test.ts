// @vitest-environment node
import { describe, expect, it } from "vitest";
import { gridUITheme } from "../../src/theme/uiTheme";

describe("grid UI theme contrast", () => {
  it("keeps borderSubtle distinct from subtle surface in light mode", () => {
    expect(gridUITheme.light.borderSubtle).not.toBe(gridUITheme.light.surface2);
  });

  it("keeps borderSubtle distinct from subtle surface in dark mode", () => {
    expect(gridUITheme.dark.borderSubtle).not.toBe(gridUITheme.dark.surface2);
  });
});
