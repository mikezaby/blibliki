// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it } from "vitest";
import { bindableControls } from "../../src/video/bindableControls";

const osc = { id: "osc", name: "Osc", moduleType: ModuleType.Oscillator };
const audioProp = {
  id: "ap",
  name: "Freq",
  moduleType: VideoModuleType.AudioProp,
  props: { moduleId: "osc", prop: "frequency" },
};
const fx = {
  id: "fx",
  name: "Hue Rotate",
  moduleType: VideoModuleType.HueRotate,
  props: { amount: 0 },
};

describe("bindableControls", () => {
  it("lists control outputs of control modules, not texture modules", () => {
    const controls = bindableControls([audioProp, fx], [osc], "other");

    expect(controls.map((c) => c.source)).toEqual([
      { moduleId: "ap", ioName: "out" },
    ]);
    expect(controls[0]?.label).toBe("Freq · out");
  });

  it("takes the range of an Audio Prop from the audio prop's schema", () => {
    const [control] = bindableControls([audioProp], [osc], "other");

    expect(control?.min).toBe(0);
    expect(control?.max).toBe(25000);
  });

  it("falls back to 0..1 when the Audio Prop points nowhere", () => {
    const bare = { ...audioProp, props: { moduleId: "", prop: "" } };
    const [control] = bindableControls([bare], [], "other");

    expect(control?.min).toBe(0);
    expect(control?.max).toBe(1);
    expect(control?.exp).toBeUndefined();
  });

  it("excludes the module being bound", () => {
    expect(bindableControls([audioProp], [osc], "ap")).toEqual([]);
  });
});
