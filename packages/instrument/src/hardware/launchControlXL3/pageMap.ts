import type { TrackPageKey } from "@/types";

export type LaunchControlXL3PageMapEntry = {
  controllerPage: 1 | 2 | 3;
  pageKey: TrackPageKey;
};

export const launchControlXL3PageMap: readonly LaunchControlXL3PageMapEntry[] =
  [
    {
      controllerPage: 1,
      pageKey: "sourceAmp",
    },
    {
      controllerPage: 2,
      pageKey: "filterMod",
    },
    {
      controllerPage: 3,
      pageKey: "fx",
    },
  ] as const;
