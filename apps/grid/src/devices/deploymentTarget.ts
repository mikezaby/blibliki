import type { DeviceDeploymentTarget } from "@blibliki/models";

export type DeviceDeploymentKind = "none" | "patch" | "instrument";

export function getDeviceDeploymentKind(
  target: DeviceDeploymentTarget | null | undefined,
): DeviceDeploymentKind {
  return target?.kind ?? "none";
}

export function getDeviceDeploymentSelection(
  target: DeviceDeploymentTarget | null | undefined,
): string {
  if (!target) {
    return "";
  }

  return target.kind === "patch" ? target.patchId : target.instrumentId;
}

export function createDeviceDeploymentTarget(
  kind: DeviceDeploymentKind,
  selection: string,
): DeviceDeploymentTarget | null {
  if (kind === "none" || selection.length === 0) {
    return null;
  }

  if (kind === "patch") {
    return {
      kind,
      patchId: selection,
    };
  }

  return {
    kind,
    instrumentId: selection,
  };
}

export function describeDeviceDeploymentTarget(
  target: DeviceDeploymentTarget | null | undefined,
): string {
  if (!target) {
    return "No target assigned";
  }

  return target.kind === "patch" ? "Patch assigned" : "Instrument assigned";
}
