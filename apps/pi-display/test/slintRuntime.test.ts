import { describe, expect, it, vi } from "vitest";
import { loadSlintRuntime } from "@/slintRuntime";

describe("loadSlintRuntime", () => {
  it("returns the imported slint runtime when loading succeeds", async () => {
    const runtime = {
      loadFile: vi.fn(),
    };

    await expect(
      loadSlintRuntime(() => Promise.resolve(runtime as never)),
    ).resolves.toBe(runtime as never);
  });

  it("wraps known native library failures with a clearer macOS hint", async () => {
    await expect(
      loadSlintRuntime(() =>
        Promise.reject(
          new Error(
            "Library not loaded: /opt/homebrew/opt/gettext/lib/libintl.8.dylib",
          ),
        ),
      ),
    ).rejects.toThrow(/install Homebrew gettext/i);
  });
});
