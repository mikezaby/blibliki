import { describe, expect, it, vi } from "vitest";
import { getCliHelpText, runCli } from "@/cliMain";

describe("runCli", () => {
  it("starts the default firestore-driven runtime path when no subcommand is given", async () => {
    const main = vi.fn().mockResolvedValue(undefined);

    await runCli([], {
      main,
      setupFirebase: vi.fn(),
      exit: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    });

    expect(main).toHaveBeenCalledWith({ gridUrl: undefined });
  });

  it("passes an explicit grid url through to the default runtime path", async () => {
    const main = vi.fn().mockResolvedValue(undefined);

    await runCli(["http://192.168.1.2:5173"], {
      main,
      setupFirebase: vi.fn(),
      exit: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    });

    expect(main).toHaveBeenCalledWith({
      gridUrl: "http://192.168.1.2:5173",
    });
  });

  it("keeps setup-firebase as the only explicit subcommand", async () => {
    const setupFirebase = vi.fn().mockResolvedValue(undefined);

    await runCli(["setup-firebase", "http://localhost:5173"], {
      main: vi.fn(),
      setupFirebase,
      exit: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    });

    expect(setupFirebase).toHaveBeenCalledWith("http://localhost:5173");
  });

  it("rejects the removed start-default subcommand", async () => {
    const error = vi.fn();
    const exit = vi.fn();

    await runCli(["start-default"], {
      main: vi.fn(),
      setupFirebase: vi.fn(),
      exit,
      error,
      log: vi.fn(),
    });

    expect(error).toHaveBeenCalledWith("Unknown command: start-default");
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe("getCliHelpText", () => {
  it("documents firestore-driven startup and the display env configuration without start-default", () => {
    const helpText = getCliHelpText();

    expect(helpText).toContain(
      "Start from the device deployment target in Firestore",
    );
    expect(helpText).not.toContain("start-default");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_MODE");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_PORT");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_DEBUG");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_TARGET_CLASS");
  });
});
