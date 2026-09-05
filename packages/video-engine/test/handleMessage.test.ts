import { describe, expect, it } from "vitest";
import { VideoEngine } from "@/VideoEngine";
import { handleMessage } from "@/handleMessage";
import { VideoModuleType } from "@/modules";

describe("handleMessage", () => {
  it("applies a graph command and echoes the patch", () => {
    const engine = new VideoEngine();

    const out = handleMessage(engine, {
      type: "addModule",
      module: { id: "src", name: "src", moduleType: VideoModuleType.Source },
    });

    expect(engine.modules.has("src")).toBe(true);
    expect(out).toEqual([{ type: "patch", patch: engine.serialize() }]);
  });

  it("loads a patch", () => {
    const engine = new VideoEngine();
    const patch = {
      modules: [
        { id: "o", name: "o", moduleType: VideoModuleType.Output, props: {} },
      ],
      routes: [],
      bindings: [],
    };

    handleMessage(engine, { type: "load", patch });

    expect(engine.serialize()).toEqual(patch);
  });

  it("stores controls without echoing", () => {
    const engine = new VideoEngine();
    engine.addModule({
      id: "fx",
      name: "fx",
      moduleType: VideoModuleType.HueRotate,
    });
    engine.addModule({
      id: "o",
      name: "o",
      moduleType: VideoModuleType.Output,
    });
    engine.addRoute({
      source: { moduleId: "fx", ioName: "out" },
      destination: { moduleId: "o", ioName: "in" },
    });
    engine.setBinding({
      id: "b",
      moduleId: "fx",
      prop: "amount",
      control: "patch:osc:frequency",
      inMin: 0,
      inMax: 1000,
      outMin: 0,
      outMax: 360,
    });

    const out = handleMessage(engine, {
      type: "controls",
      values: { "patch:osc:frequency": 500 },
    });

    expect(out).toEqual([]);
    expect(engine.passes()[0]?.uniforms.amount).toBe(180);
  });

  it("turns spectrum bins into controls and hands the buffer back", () => {
    const engine = new VideoEngine();
    const bins = new Float32Array([-30, -30, -30]);

    const out = handleMessage(engine, { type: "spectrum", bins });

    expect(out).toEqual([{ type: "spectrumBuffer", bins }]);
  });

  it("reports a thrown error instead of crashing", () => {
    const engine = new VideoEngine();

    const out = handleMessage(engine, { type: "removeModule", id: "x" });
    const bad = handleMessage(engine, {
      type: "updateProps",
      id: "missing",
      props: {},
    });

    expect(out[0]?.type).toBe("patch");
    expect(bad).toEqual([
      { type: "error", message: "Video module not found: missing" },
    ]);
  });
});
