import { Device } from "@blibliki/models";
import { describe, expect, it, vi } from "vitest";
import { resolveConfiguredDevice } from "@/index";

describe("resolveConfiguredDevice", () => {
  it("falls back to the cached instrument deployment when Firestore lookup fails and a working copy exists", async () => {
    const updateConfig = vi.fn();

    const device = await resolveConfiguredDevice(
      {
        token: "token-1",
        userId: "user-1",
        deviceId: "device-1",
        deviceName: "Cached Device",
        deploymentTarget: {
          kind: "instrument",
          instrumentId: "instrument-1",
        },
      },
      {
        findDevices: () => Promise.reject(new Error("offline")),
        updateConfig,
        hasInstrumentWorkingCopy: () => true,
      },
    );

    expect(device).toBeInstanceOf(Device);
    expect(device.id).toBe("device-1");
    expect(device.name).toBe("Cached Device");
    expect(device.deploymentTarget).toEqual({
      kind: "instrument",
      instrumentId: "instrument-1",
    });
    expect(updateConfig).not.toHaveBeenCalled();
  });
});
