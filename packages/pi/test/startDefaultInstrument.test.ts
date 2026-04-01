import type { InstrumentDisplayState } from "@blibliki/instrument";
import { describe, expect, it, vi } from "vitest";
import type { StartDefaultInstrumentDependencies } from "@/defaultInstrument";
import { startDefaultInstrument } from "@/defaultInstrument";
import type { StartedInstrumentSession } from "@/instrumentSession";

describe("startDefaultInstrument", () => {
  it("renders through the configured display output and disposes it on shutdown", async () => {
    const render = vi.fn();
    const disposeDisplay = vi.fn();
    const disposeController = vi.fn();
    const displayState = {} as InstrumentDisplayState;
    const startedSession = {
      session: {
        compiledInstrument: [],
        patch: {
          modules: [],
          routes: [],
        },
        runtime: {
          controllerInputId: undefined,
          controllerOutputId: undefined,
          droneNote: "C3",
        },
      },
      engine: {
        dispose: vi.fn(),
        findMidiInputDeviceByFuzzyName: vi.fn(() => null),
        findMidiOutputDeviceByFuzzyName: vi.fn(() => null),
        triggerVirtualMidi: vi.fn(),
      },
      controllerSession: {
        dispose: disposeController,
      },
      getDisplayState: vi.fn(() => displayState),
      dispose: vi.fn(),
    } as unknown as StartedInstrumentSession;
    const startInstrumentSession = vi.fn<
      NonNullable<StartDefaultInstrumentDependencies["startInstrumentSession"]>
    >((_document, options) => {
      options?.onDisplayStateChange?.(displayState);
      return Promise.resolve(startedSession);
    });
    const waitForShutdown = vi.fn<
      NonNullable<StartDefaultInstrumentDependencies["waitForShutdown"]>
    >((_engine, _session, onShutdown) => {
      onShutdown?.();
      return Promise.resolve();
    });

    await startDefaultInstrument(
      {},
      {
        startInstrumentSession,
        createConfiguredDisplayOutput: () => ({
          render,
          dispose: disposeDisplay,
        }),
        waitForShutdown,
      },
    );

    expect(render).toHaveBeenCalledWith(displayState);
    expect(disposeDisplay).toHaveBeenCalledTimes(1);
    expect(disposeController).toHaveBeenCalledTimes(1);
    expect(waitForShutdown).toHaveBeenCalledTimes(1);
  });
});
