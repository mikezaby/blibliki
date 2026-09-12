import { describe, expect, it } from "vitest";
import {
  resolveInstances,
  instanceRect,
  instancesProp,
} from "@/core/instances";
import { createModule, VideoModuleType } from "@/modules";

describe("instanceRect", () => {
  it("fills a grid row-major from the top left", () => {
    expect(instanceRect(0, 4, "grid")).toEqual({
      x: 0,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    });
    expect(instanceRect(3, 4, "grid")).toEqual({
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 0.5,
    });
  });

  it("picks the squarest grid and leaves the tail of the last row empty", () => {
    expect(instanceRect(4, 5, "grid")).toEqual({
      x: 1 / 3,
      y: 0,
      width: 1 / 3,
      height: 0.5,
    });
  });

  it("stacks strips top to bottom", () => {
    expect(instanceRect(0, 3, "strips")).toEqual({
      x: 0,
      y: 1 - 1 / 3,
      width: 1,
      height: 1 / 3,
    });
  });
});

describe("instancesProp", () => {
  it("defaults to one and rounds a modulated count", () => {
    expect(instancesProp({})).toBe(1);
    expect(instancesProp({ instances: 0.2 })).toBe(1);
    expect(instancesProp({ instances: 8.6 })).toBe(9);
  });
});

describe("resolveInstances", () => {
  it("reads each module's own instances prop, and single for modules without one", () => {
    const modules = new Map(
      [
        createModule({
          id: "src",
          name: "src",
          moduleType: VideoModuleType.Source,
          props: { instances: 3 },
        }),
        createModule({
          id: "fx",
          name: "fx",
          moduleType: VideoModuleType.HueRotate,
        }),
        createModule({
          id: "layout",
          name: "layout",
          moduleType: VideoModuleType.Layout,
        }),
        createModule({
          id: "out",
          name: "out",
          moduleType: VideoModuleType.Output,
        }),
      ].map((m) => [m.id, m]),
    );

    const counts = resolveInstances(modules, (m) => m.props);

    expect(Object.fromEntries(counts)).toEqual({
      src: 3,
      fx: 1,
      layout: 1,
      out: 1,
    });
  });
});
