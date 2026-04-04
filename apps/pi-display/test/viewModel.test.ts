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
    const cell = viewModel.bands[0]?.cells[0];
    const globalBand = viewModel.bands[0];
    const upperBand = viewModel.bands[1];
    const lowerBand = viewModel.bands[2];
    const lastGlobalCell = globalBand?.cells[7];

    expect(viewModel.header.center).toBe("track-2");
    expect(viewModel.layout).toEqual({
      targetClass: "standard",
      compact: false,
      width: 1280,
      height: 720,
    });
    expect(cell).toBeDefined();
    expect(cell?.label).toBe("BPM");
    expect(cell?.value).toBe("137");
    expect(cell?.visualNormalized).toBe(0.75);
    expect(cell?.encoderArcPath).toContain("A 26 26");
    expect("encoderNeedlePath" in (cell ?? {})).toBe(false);
    expect(globalBand?.cells).toHaveLength(8);
    expect(upperBand?.cells).toHaveLength(8);
    expect(lowerBand?.cells).toHaveLength(8);
    expect(lastGlobalCell?.empty).toBe(true);
    expect(lastGlobalCell?.value).toBe("--");
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
