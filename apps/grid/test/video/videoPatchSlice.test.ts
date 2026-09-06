// @vitest-environment jsdom
import { VideoModuleType, type IRoute } from "@blibliki/video-engine";
import { describe, expect, it } from "vitest";
import reducer, {
  addVideoRoute,
  EMPTY_VIDEO_PATCH,
  removeVideoModule,
  setVideoPatch,
} from "../../src/video/videoPatchSlice";

const audioProp = {
  id: "ap",
  name: "Audio Prop",
  moduleType: VideoModuleType.AudioProp,
  props: { moduleId: "osc", prop: "frequency" },
};
const fx = {
  id: "fx",
  name: "Hue Rotate",
  moduleType: VideoModuleType.HueRotate,
  props: { amount: 0 },
};
const control: IRoute = {
  id: "c1",
  kind: "control",
  source: { moduleId: "ap", ioName: "out" },
  destination: { moduleId: "fx", ioName: "amount" },
};
const texture: IRoute = {
  id: "t1",
  kind: "texture",
  source: { moduleId: "src", ioName: "out" },
  destination: { moduleId: "fx", ioName: "in" },
};

describe("videoPatchSlice", () => {
  it("removing a module drops routes on either end", () => {
    const state = {
      modules: [audioProp, fx],
      routes: [control, texture],
    };

    expect(reducer(state, removeVideoModule("ap")).routes).toEqual([texture]);
    expect(reducer(state, removeVideoModule("fx")).routes).toEqual([]);
  });

  it("keeps several control routes into one prop", () => {
    const second = {
      ...control,
      id: "c2",
      source: { moduleId: "lfo", ioName: "out" },
    };
    const state = reducer(
      { modules: [], routes: [control] },
      addVideoRoute(second),
    );

    expect(state.routes).toEqual([control, second]);
  });

  it("replaces a texture route into an occupied input", () => {
    const second = {
      ...texture,
      id: "t2",
      source: { moduleId: "other", ioName: "out" },
    };
    const state = reducer(
      { modules: [], routes: [texture, control] },
      addVideoRoute(second),
    );

    expect(state.routes).toEqual([control, second]);
  });

  it("loads a saved patch without its bindings and with route kinds", () => {
    const saved = {
      modules: [fx],
      routes: [
        { id: "t1", source: texture.source, destination: texture.destination },
      ],
      bindings: [{ id: "b" }],
    };

    expect(reducer(EMPTY_VIDEO_PATCH, setVideoPatch(saved))).toEqual({
      modules: [fx],
      routes: [texture],
    });
  });
});
