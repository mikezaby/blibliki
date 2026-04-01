import type { DisplayProtocolState } from "@blibliki/display-protocol";
import { describe, expect, it } from "vitest";
import { createDashboardViewModel } from "@/viewModel";

function createState(
  targetClass: DisplayProtocolState["screen"]["targetClass"] = "standard",
): DisplayProtocolState {
  return {
    revision: 7,
    screen: {
      orientation: "landscape",
      targetClass,
    },
    header: {
      left: "Blibliki Pi",
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
      {
        key: "upper",
        title: "FILTER",
        cells: [],
      },
      {
        key: "lower",
        title: "MOD",
        cells: [],
      },
    ],
  };
}

describe("createDashboardViewModel", () => {
  it("maps structured display state into renderer-friendly props", () => {
    const viewModel = createDashboardViewModel(createState());

    expect(viewModel.header.center).toBe("track-2");
    expect(viewModel.layout).toEqual({
      targetClass: "standard",
      compact: false,
      width: 1280,
      height: 720,
    });
    expect(viewModel.bands[0]?.cells[0]).toEqual(
      expect.objectContaining({
        label: "BPM",
        value: "137 BPM",
        visualNormalized: 0.75,
      }),
    );
    expect("revision" in viewModel).toBe(false);
  });

  it("derives the compact layout preset from compact-standard target class", () => {
    const viewModel = createDashboardViewModel(createState("compact-standard"));

    expect(viewModel.layout).toEqual({
      targetClass: "compact-standard",
      compact: true,
      width: 800,
      height: 480,
    });
  });
});
