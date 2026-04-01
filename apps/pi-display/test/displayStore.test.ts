import type {
  DisplayBandState,
  DisplayHeaderState,
  DisplayProtocolState,
  DisplayOscMessage,
} from "@blibliki/display-protocol";
import { describe, expect, it } from "vitest";
import { createDisplayStore } from "@/displayStore";

function createState(revision: number): DisplayProtocolState {
  return {
    revision,
    screen: {
      orientation: "landscape",
      targetClass: "standard",
    },
    header: {
      left: "Blibliki Pi",
      center: revision === 4 ? "track-1" : "track-2",
      right: "Page 1: SOURCE / AMP",
      transport: "STOP",
      mode: "PERF",
    },
    bands: [
      {
        key: "global",
        title: "GLOBAL",
        cells: [],
      },
      {
        key: "upper",
        title: "SOURCE",
        cells: [],
      },
      {
        key: "lower",
        title: "AMP",
        cells: [],
      },
    ],
  };
}

describe("createDisplayStore", () => {
  it("applies full snapshots and ignores stale header updates", () => {
    const store = createDisplayStore();
    const staleHeader: DisplayHeaderState = {
      left: "Blibliki Pi",
      center: "track-stale",
      right: "Page 0: STALE / STALE",
      transport: "PLAY",
      mode: "SEQ",
    };

    store.apply({
      type: "display.full",
      state: createState(4),
    });
    store.apply({
      type: "display.header",
      revision: 3,
      header: staleHeader,
    });

    expect(store.getState()).toEqual(createState(4));
  });

  it("applies newer partial updates by section", () => {
    const store = createDisplayStore();
    const updatedBand: DisplayBandState = {
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
    };

    store.apply({
      type: "display.full",
      state: createState(1),
    });
    store.apply({
      type: "display.band",
      revision: 2,
      bandKey: "global",
      band: updatedBand,
    } satisfies DisplayOscMessage);

    expect(store.getState()?.revision).toBe(2);
    expect(store.getState()?.bands[0]).toEqual(updatedBand);
  });
});
