// @vitest-environment node
import { type IRoute, VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it } from "vitest";
import { patchMessages } from "../../src/video/patchDiff";

const src = {
  id: "src",
  name: "src",
  moduleType: VideoModuleType.Source,
  props: { hue: 10 },
};
const fx = {
  id: "fx",
  name: "fx",
  moduleType: VideoModuleType.HueRotate,
  props: { amount: 0 },
};
const route: IRoute = {
  id: "r1",
  kind: "texture",
  source: { moduleId: "src", ioName: "out" },
  destination: { moduleId: "fx", ioName: "in" },
};
const patch = { modules: [src, fx], routes: [route] };

describe("patchMessages", () => {
  it("sends nothing for the same patch", () => {
    expect(patchMessages(patch, patch)).toEqual([]);
    expect(patchMessages(patch, { ...patch })).toEqual([]);
  });

  it("updates only the props of a module whose props changed", () => {
    const next = {
      ...patch,
      modules: [{ ...src, props: { hue: 90 } }, fx],
    };

    expect(patchMessages(patch, next)).toEqual([
      { type: "updateProps", id: "src", props: { hue: 90 } },
    ]);
  });

  it("adds a module before the routes into it, and removes routes before a module", () => {
    const added = patchMessages({ modules: [src], routes: [] }, patch);

    expect(added.map((m) => m.type)).toEqual(["addModule", "addRoute"]);
    expect(added[0]).toMatchObject({ module: fx });
    expect(added[1]).toMatchObject({ route });

    const removed = patchMessages(patch, { modules: [src], routes: [] });

    expect(removed).toEqual([
      { type: "removeRoute", id: "r1" },
      { type: "removeModule", id: "fx" },
    ]);
  });

  it("re-adds a route whose range changed, under the same id", () => {
    const control: IRoute = {
      id: "c1",
      kind: "control",
      source: { moduleId: "lfo", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    };
    const before = { modules: [fx], routes: [control] };
    const after = { modules: [fx], routes: [{ ...control, outMax: 180 }] };

    expect(patchMessages(before, after)).toEqual([
      { type: "removeRoute", id: "c1" },
      { type: "addRoute", route: { ...control, outMax: 180 } },
    ]);
  });
});
