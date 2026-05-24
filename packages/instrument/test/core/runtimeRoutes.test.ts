import type { IRoute } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import {
  createExpandedRoutes,
  createRuntimeRouteId,
} from "@/core/runtimeRoutes";

describe("runtime route helpers", () => {
  it("creates deterministic runtime route ids", () => {
    expect(
      createRuntimeRouteId(
        "track-1",
        { moduleId: "track-1.source.main", ioName: "out" },
        { moduleId: "track-1.trackGain.main", ioName: "in" },
      ),
    ).toBe(
      "track-1:runtime:track-1.source.main.out->track-1.trackGain.main.in",
    );
  });

  it("creates expanded routes between every source and destination plug", () => {
    const routes: IRoute[] = createExpandedRoutes(
      "track-1",
      [
        { moduleId: "track-1.source.left", ioName: "out" },
        { moduleId: "track-1.source.right", ioName: "out" },
      ],
      [{ moduleId: "instrument.runtime.masterFilter", ioName: "in" }],
    );

    expect(routes).toEqual([
      {
        id: "track-1:runtime:track-1.source.left.out->instrument.runtime.masterFilter.in",
        source: { moduleId: "track-1.source.left", ioName: "out" },
        destination: {
          moduleId: "instrument.runtime.masterFilter",
          ioName: "in",
        },
      },
      {
        id: "track-1:runtime:track-1.source.right.out->instrument.runtime.masterFilter.in",
        source: { moduleId: "track-1.source.right", ioName: "out" },
        destination: {
          moduleId: "instrument.runtime.masterFilter",
          ioName: "in",
        },
      },
    ]);
  });
});
