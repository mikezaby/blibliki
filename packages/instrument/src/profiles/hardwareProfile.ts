export const DEFAULT_HARDWARE_PROFILE_ID = "launchcontrolxl3-pi-lcd" as const;

export type HardwareProfileId = typeof DEFAULT_HARDWARE_PROFILE_ID;

export type HardwareProfile = {
  id: HardwareProfileId;
  name: string;
  controller: "launchcontrolxl3";
  display: "pi-lcd";
  controllerPages: 3;
  slotsPerRow: 8;
};

export const hardwareProfiles: Record<HardwareProfileId, HardwareProfile> = {
  [DEFAULT_HARDWARE_PROFILE_ID]: {
    id: DEFAULT_HARDWARE_PROFILE_ID,
    name: "LaunchControl XL3 + Pi LCD",
    controller: "launchcontrolxl3",
    display: "pi-lcd",
    controllerPages: 3,
    slotsPerRow: 8,
  },
};

export function getHardwareProfile(
  profileId: HardwareProfileId,
): HardwareProfile {
  return hardwareProfiles[profileId];
}
