import { describe, expect, it } from "vitest";
import { VideoEngine } from "@/VideoEngine";
import { handleMessage } from "@/handleMessage";
import { VideoModuleType } from "@/modules";

function fxToOutput() {
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

  return engine;
}

describe("handleMessage", () => {
  it("delivers a bridged note to a module's MIDI input without echoing the patch", () => {
    const engine = new VideoEngine();
    engine.addModule({
      id: "notes",
      name: "notes",
      moduleType: VideoModuleType.MidiNotes,
      props: { instances: 2 },
    });

    const out = handleMessage(engine, {
      type: "midi",
      moduleId: "notes",
      ioName: "in",
      event: { type: "noteOn", note: 60, velocity: 0.5, instance: 1 },
    });

    expect(out).toEqual([]);
    expect(
      engine
        .findModule("notes")
        .tick(new Map(), { now: 0, dt: 0 }, undefined, 1),
    ).toEqual({ gate: 1, note: 60, velocity: 0.5 });
  });

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
    };

    handleMessage(engine, { type: "load", patch });

    expect(engine.serialize()).toEqual(patch);
  });

  it("stores controls without echoing", () => {
    const engine = fxToOutput();
    engine.addModule({
      id: "ap",
      name: "ap",
      moduleType: VideoModuleType.AudioProp,
      props: { moduleId: "osc", prop: "frequency" },
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "ap", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1000,
      outMin: 0,
      outMax: 360,
    });

    const out = handleMessage(engine, {
      type: "controls",
      values: { "patch:osc:frequency": 500 },
    });
    engine.tick({ now: 0, dt: 0 });

    expect(out).toEqual([]);
    expect(engine.passes()[0]?.uniforms.amount).toBe(180);
  });

  it("stores spectrum bins and hands the buffer back", () => {
    const engine = new VideoEngine();
    const bins = new Float32Array([-30, -30, -30]);

    const out = handleMessage(engine, {
      type: "spectrum",
      moduleId: "m1",
      bins,
      sampleRate: 48000,
    });

    expect(out).toEqual([{ type: "spectrumBuffer", moduleId: "m1", bins }]);
    expect(engine.spectra.get("m1")).toEqual({
      bins: new Float32Array([-30, -30, -30]),
      sampleRate: 48000,
    });
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
