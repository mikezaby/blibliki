// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizePatchViewMode } from "../../src/routes/patch.$patchId";

describe("normalizePatchViewMode", () => {
  it("defaults to editor mode when the search param is missing", () => {
    expect(normalizePatchViewMode({})).toBe("editor");
  });

  it("returns runtime mode when explicitly requested", () => {
    expect(normalizePatchViewMode({ mode: "runtime" })).toBe("runtime");
  });

  it("falls back to editor mode for unknown values", () => {
    expect(normalizePatchViewMode({ mode: "benchmark" })).toBe("editor");
  });
});
