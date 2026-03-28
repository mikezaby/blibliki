import type { InstrumentDisplayState } from "@blibliki/instrument";
import { Device } from "@blibliki/models";
import { describe, expect, it, vi } from "vitest";
import { maybeAutoStartDeployment, startConfiguredDevice } from "@/index";

describe("startConfiguredDevice", () => {
  it("wires terminal display rendering into instrument deployments", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });
    const render = vi.fn();
    const displayState = {} as InstrumentDisplayState;

    await startConfiguredDevice(device, {
      createTerminalDisplaySession: () => ({
        render,
        dispose: () => undefined,
      }),
      startDeviceDeployment: (_device, dependencies = {}) => {
        dependencies.instrumentSessionOptions?.onDisplayStateChange?.(
          displayState,
        );

        return Promise.resolve({
          kind: "instrument",
          startedSession: {} as never,
        });
      },
    });

    expect(render).toHaveBeenCalledWith(displayState);
  });

  it("does not create a terminal display for patch deployments", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "patch",
        patchId: "patch-1",
      },
      userId: "user-1",
    });
    const createTerminalDisplaySession = vi.fn();

    await startConfiguredDevice(device, {
      createTerminalDisplaySession,
      startDeviceDeployment: () =>
        Promise.resolve({
          kind: "patch",
          engine: {} as never,
        }),
    });

    expect(createTerminalDisplaySession).not.toHaveBeenCalled();
  });
});

describe("maybeAutoStartDeployment", () => {
  it("starts a patch deployment engine when BLIBLIKI_PI_AUTOSTART=1", async () => {
    const start = vi.fn(() => Promise.resolve());

    const didAutoStart = await maybeAutoStartDeployment(
      {
        kind: "patch",
        engine: {
          start,
        },
      },
      { BLIBLIKI_PI_AUTOSTART: "1" },
    );

    expect(didAutoStart).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("starts an instrument deployment engine when BLIBLIKI_PI_AUTOSTART=1", async () => {
    const start = vi.fn(() => Promise.resolve());

    const didAutoStart = await maybeAutoStartDeployment(
      {
        kind: "instrument",
        startedSession: {
          engine: {
            start,
          },
        } as never,
      },
      { BLIBLIKI_PI_AUTOSTART: "1" },
    );

    expect(didAutoStart).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("does nothing when BLIBLIKI_PI_AUTOSTART is not enabled", async () => {
    const start = vi.fn(() => Promise.resolve());

    const didAutoStart = await maybeAutoStartDeployment(
      {
        kind: "patch",
        engine: {
          start,
        },
      },
      {},
    );

    expect(didAutoStart).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });
});
