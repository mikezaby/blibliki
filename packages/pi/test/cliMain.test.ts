import { describe, expect, it, vi } from "vitest";
import { getCliHelpText, runCli } from "@/cliMain";

describe("runCli", () => {
  it("starts the default firestore-driven runtime path when no subcommand is given", async () => {
    const main = vi.fn().mockResolvedValue(undefined);

    await runCli([], {
      main,
      startDefaultInstrument: vi.fn(),
      startTrackProcessBenchmark: vi.fn(),
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
      startDefaultInstrument: vi.fn(),
      startTrackProcessBenchmark: vi.fn(),
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
      startDefaultInstrument: vi.fn(),
      startTrackProcessBenchmark: vi.fn(),
      setupFirebase,
      exit: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    });

    expect(setupFirebase).toHaveBeenCalledWith("http://localhost:5173");
  });

  it("starts the default instrument runtime from the explicit start-default subcommand", async () => {
    const startDefaultInstrument = vi.fn().mockResolvedValue(undefined);

    await runCli(["start-default"], {
      main: vi.fn(),
      startDefaultInstrument,
      startTrackProcessBenchmark: vi.fn(),
      setupFirebase: vi.fn(),
      exit: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    });

    expect(startDefaultInstrument).toHaveBeenCalledWith();
  });

  it("starts the track benchmark runtime from the explicit benchmark-tracks subcommand", async () => {
    const startTrackProcessBenchmark = vi.fn().mockResolvedValue(undefined);

    await runCli(["benchmark-tracks"], {
      main: vi.fn(),
      startDefaultInstrument: vi.fn(),
      startTrackProcessBenchmark,
      setupFirebase: vi.fn(),
      exit: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    });

    expect(startTrackProcessBenchmark).toHaveBeenCalledWith();
  });
});

describe("getCliHelpText", () => {
  it("documents firestore-driven startup, default instrument startup, and the display env configuration", () => {
    const helpText = getCliHelpText();

    expect(helpText).toContain(
      "Start from the device deployment target in Firestore",
    );
    expect(helpText).toContain("start-default");
    expect(helpText).toContain("benchmark-tracks");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_MODE");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_PORT");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_DEBUG");
    expect(helpText).toContain("BLIBLIKI_PI_DISPLAY_TARGET_CLASS");
  });
});
