// @vitest-environment node
import { VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it } from "vitest";
import reducer, {
  addVideoModule,
  addVideoRoute,
  EMPTY_VIDEO_PATCH,
  removeBindingsForAudioModule,
  removeVideoModule,
  setVideoBinding,
  updateVideoModuleProps,
} from "../../src/video/videoPatchSlice";

const src = {
  id: "src",
  name: "Source",
  moduleType: VideoModuleType.Source,
  props: {
    mode: "solid" as const,
    hue: 0,
    saturation: 1,
    lightness: 0.5,
    spread: 180,
  },
};
const fx = {
  id: "fx",
  name: "Hue",
  moduleType: VideoModuleType.HueRotate,
  props: { amount: 0 },
};
const route = {
  id: "r1",
  source: { moduleId: "src", ioName: "out" },
  destination: { moduleId: "fx", ioName: "in" },
};
const binding = {
  id: "fx:amount",
  moduleId: "fx",
  prop: "amount",
  control: "spectrum:spec1:low",
  inMin: 0,
  inMax: 1,
  outMin: 0,
  outMax: 360,
};

function patch() {
  let state = reducer(EMPTY_VIDEO_PATCH, addVideoModule(src));
  state = reducer(state, addVideoModule(fx));
  state = reducer(state, addVideoRoute(route));
  return reducer(state, setVideoBinding(binding));
}

describe("videoPatchSlice", () => {
  it("updates props by merging", () => {
    const state = reducer(
      patch(),
      updateVideoModuleProps({ id: "fx", props: { amount: 90 } }),
    );
    expect(state.modules[1]?.props).toEqual({ amount: 90 });
  });

  it("replaces a route into an occupied input", () => {
    const state = reducer(patch(), addVideoRoute({ ...route, id: "r2" }));
    expect(state.routes.map((r) => r.id)).toEqual(["r2"]);
  });

  it("removing a module drops its routes and bindings", () => {
    const state = reducer(patch(), removeVideoModule("fx"));
    expect(state.modules.map((m) => m.id)).toEqual(["src"]);
    expect(state.routes).toEqual([]);
    expect(state.bindings).toEqual([]);
  });

  it("setting a binding replaces one with the same id", () => {
    const state = reducer(
      patch(),
      setVideoBinding({ ...binding, outMax: 180 }),
    );
    expect(state.bindings).toEqual([{ ...binding, outMax: 180 }]);
  });

  it("drops bindings that read a removed audio module", () => {
    const state = reducer(patch(), removeBindingsForAudioModule("spec1"));
    expect(state.bindings).toEqual([]);
  });
});
