import { describe, expect, it } from "vitest";
import { VIDEO_ENGINE } from "@/index";

describe("package", () => {
  it("resolves the @/ alias", () => {
    expect(VIDEO_ENGINE).toBe("video-engine");
  });
});
