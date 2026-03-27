import type { DeviceDeploymentTarget } from "@blibliki/models";
import { describe, expect, it } from "vitest";
import {
  createDeviceDeploymentTarget,
  describeDeviceDeploymentTarget,
  getDeviceDeploymentKind,
  getDeviceDeploymentSelection,
} from "../../src/devices/deploymentTarget";

describe("device deployment target helpers", () => {
  it("derives the form kind from the saved device target", () => {
    expect(getDeviceDeploymentKind(null)).toBe("none");
    expect(
      getDeviceDeploymentKind({
        kind: "patch",
        patchId: "patch-1",
      }),
    ).toBe("patch");
    expect(
      getDeviceDeploymentKind({
        kind: "instrument",
        instrumentId: "instrument-1",
      }),
    ).toBe("instrument");
  });

  it("creates the correct saved target payload from the form selection", () => {
    expect(createDeviceDeploymentTarget("none", "patch-1")).toBeNull();
    expect(createDeviceDeploymentTarget("patch", "patch-1")).toEqual({
      kind: "patch",
      patchId: "patch-1",
    });
    expect(createDeviceDeploymentTarget("instrument", "instrument-1")).toEqual({
      kind: "instrument",
      instrumentId: "instrument-1",
    });
  });

  it("returns the visible selection id and summary copy for device cards", () => {
    const patchTarget: DeviceDeploymentTarget = {
      kind: "patch",
      patchId: "patch-1",
    };
    const instrumentTarget: DeviceDeploymentTarget = {
      kind: "instrument",
      instrumentId: "instrument-1",
    };

    expect(getDeviceDeploymentSelection(null)).toBe("");
    expect(getDeviceDeploymentSelection(patchTarget)).toBe("patch-1");
    expect(getDeviceDeploymentSelection(instrumentTarget)).toBe("instrument-1");

    expect(describeDeviceDeploymentTarget(null)).toBe("No target assigned");
    expect(describeDeviceDeploymentTarget(patchTarget)).toBe("Patch assigned");
    expect(describeDeviceDeploymentTarget(instrumentTarget)).toBe(
      "Instrument assigned",
    );
  });
});
