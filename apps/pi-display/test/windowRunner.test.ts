import { describe, expect, it, vi } from "vitest";
import { runWindowWithFallback, shouldUseShowOnlyMode } from "@/windowRunner";

describe("shouldUseShowOnlyMode", () => {
  it("prefers show-only mode when linuxkms is requested explicitly", () => {
    expect(
      shouldUseShowOnlyMode(
        {
          SLINT_BACKEND: "linuxkms-software",
        },
        "linux",
      ),
    ).toBe(true);
  });

  it("prefers show-only mode on Linux without a window-system environment", () => {
    expect(shouldUseShowOnlyMode({}, "linux")).toBe(true);
  });

  it("keeps normal run mode on Linux when DISPLAY is present", () => {
    expect(
      shouldUseShowOnlyMode(
        {
          DISPLAY: ":0",
        },
        "linux",
      ),
    ).toBe(false);
  });

  it("keeps normal run mode on macOS", () => {
    expect(shouldUseShowOnlyMode({}, "darwin")).toBe(false);
  });
});

describe("runWindowWithFallback", () => {
  it("skips run() when show-only mode is requested", async () => {
    const window = {
      run: vi.fn(),
      show: vi.fn(),
    };
    const logger = {
      debug: vi.fn(),
    };
    const keepAlive = vi.fn(() => Promise.resolve());

    await expect(
      runWindowWithFallback(window, logger, {
        preferShowOnlyMode: true,
        keepAlive,
      }),
    ).resolves.toBeUndefined();

    expect(window.run).not.toHaveBeenCalled();
    expect(window.show).toHaveBeenCalledTimes(1);
    expect(keepAlive).toHaveBeenCalledTimes(1);
  });

  it("resolves normally when the backend supports run()", async () => {
    const window = {
      run: vi.fn().mockResolvedValue(undefined),
      show: vi.fn(),
    };
    const logger = {
      debug: vi.fn(),
    };

    await expect(
      runWindowWithFallback(window, logger, {
        keepAlive: () => Promise.resolve(),
      }),
    ).resolves.toBeUndefined();

    expect(window.run).toHaveBeenCalledTimes(1);
    expect(window.show).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it("falls back to show-only mode when Slint has no event loop provider", async () => {
    const window = {
      run: vi
        .fn()
        .mockRejectedValue(
          new Error("The Slint platform does not provide an event loop"),
        ),
      show: vi.fn(),
    };
    const logger = {
      debug: vi.fn(),
    };
    const keepAlive = vi.fn(() => Promise.resolve());

    await expect(
      runWindowWithFallback(window, logger, {
        keepAlive,
      }),
    ).resolves.toBeUndefined();

    expect(window.run).toHaveBeenCalledTimes(1);
    expect(window.show).toHaveBeenCalledTimes(1);
    expect(keepAlive).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringMatching(/does not provide a node event loop/i),
    );
  });

  it("rethrows unrelated startup errors", async () => {
    const window = {
      run: vi.fn().mockRejectedValue(new Error("boom")),
      show: vi.fn(),
    };
    const logger = {
      debug: vi.fn(),
    };

    await expect(
      runWindowWithFallback(window, logger, {
        keepAlive: () => Promise.resolve(),
      }),
    ).rejects.toThrow("boom");

    expect(window.show).not.toHaveBeenCalled();
  });
});
