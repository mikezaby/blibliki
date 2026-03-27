import type { InstrumentDisplayState } from "@blibliki/instrument";
import { Device } from "@blibliki/models";
import { describe, expect, it, vi } from "vitest";
import { startConfiguredDevice } from "@/index";

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
