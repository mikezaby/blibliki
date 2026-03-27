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
});

describe("getCliHelpText", () => {
  it("documents firestore-driven startup and no longer advertises default-instrument", () => {
    const helpText = getCliHelpText();

    expect(helpText).toContain(
      "Start from the device deployment target in Firestore",
    );
    expect(helpText).not.toContain("default-instrument");
  });
});
