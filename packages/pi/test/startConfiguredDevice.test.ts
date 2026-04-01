import type { InstrumentDisplayState } from "@blibliki/instrument";
import { Device } from "@blibliki/models";
import { describe, expect, it, vi } from "vitest";
import { startConfiguredDevice } from "@/index";

describe("startConfiguredDevice", () => {
  it("wires configured display output rendering into instrument deployments", async () => {
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
    const dispose = vi.fn();
    const displayState = {} as InstrumentDisplayState;

    await startConfiguredDevice(device, {
      createConfiguredDisplayOutput: () => ({
        render,
        dispose,
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

  it("does not create a display output for patch deployments", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "patch",
        patchId: "patch-1",
      },
      userId: "user-1",
    });
    const createConfiguredDisplayOutput = vi.fn();

    await startConfiguredDevice(device, {
      createConfiguredDisplayOutput,
      startDeviceDeployment: () =>
        Promise.resolve({
          kind: "patch",
          engine: {} as never,
        }),
    });

    expect(createConfiguredDisplayOutput).not.toHaveBeenCalled();
  });
});
