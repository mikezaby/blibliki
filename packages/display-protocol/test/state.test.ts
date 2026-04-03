import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_OSC_PORT,
  DEFAULT_PI_OSC_PORT,
  type DisplayProtocolState,
} from "@/index";

describe("DisplayProtocolState", () => {
  it("keeps header, three bands, and renderer-ready value metadata together", () => {
    const state: DisplayProtocolState = {
      revision: 7,
      screen: {
        orientation: "landscape",
        targetClass: "standard",
      },
      header: {
        left: "Blibliki",
        center: "track-2",
        right: "Page 2: FILTER / MOD",
        transport: "PLAY",
        mode: "PERF",
      },
      bands: [
        {
          key: "global",
          title: "GLOBAL",
          cells: [
            {
              key: "tempo",
              label: "BPM",
              inactive: false,
              empty: false,
              value: {
                kind: "number",
                raw: 137,
                formatted: "137 BPM",
                visualNormalized: 0.75,
                visualScale: "linear",
              },
            },
          ],
        },
      ],
    };

    expect(state.bands[0]?.cells[0]?.value).toEqual(
      expect.objectContaining({
        raw: 137,
        formatted: "137 BPM",
        visualNormalized: 0.75,
      }),
    );
    expect(DEFAULT_DISPLAY_OSC_PORT).not.toBe(DEFAULT_PI_OSC_PORT);
  });
});
