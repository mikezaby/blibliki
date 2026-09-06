import { describe, expect, it } from "vitest";
import { VideoEngine } from "@/VideoEngine";
import { IRoute } from "@/core/Routes";
import { VideoModuleType } from "@/modules";

function chain() {
  const engine = new VideoEngine();
  const src = engine.addModule({
    id: "src",
    name: "src",
    moduleType: VideoModuleType.Source,
  });
  const fx = engine.addModule({
    id: "fx",
    name: "fx",
    moduleType: VideoModuleType.HueRotate,
  });
  const out = engine.addModule({
    id: "out",
    name: "out",
    moduleType: VideoModuleType.Output,
  });
  engine.addRoute({
    source: { moduleId: src.id, ioName: "out" },
    destination: { moduleId: fx.id, ioName: "in" },
  });
  engine.addRoute({
    source: { moduleId: fx.id, ioName: "out" },
    destination: { moduleId: out.id, ioName: "in" },
  });

  return engine;
}

function withAudioProp(engine: VideoEngine) {
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

  return engine;
}

const control: Omit<IRoute, "id"> = {
  kind: "control",
  source: { moduleId: "ap", ioName: "out" },
  destination: { moduleId: "fx", ioName: "amount" },
  inMin: 0,
  inMax: 1,
  outMin: 0,
  outMax: 360,
};

describe("VideoEngine", () => {
  it("builds passes for the chain", () => {
    expect(
      chain()
        .passes()
        .map((p) => p.moduleId),
    ).toEqual(["src", "fx", "out"]);
  });

  it("does not build a pass for a control module", () => {
    const engine = withAudioProp(chain());

    expect(engine.passes().map((p) => p.moduleId)).toEqual([
      "src",
      "fx",
      "out",
    ]);
  });

  it("applies a control route after a tick", () => {
    const engine = withAudioProp(chain());
    engine.setControls({ "patch:osc:frequency": 250 });
    engine.tick({ now: 0, dt: 0 });

    expect(engine.passes()[1]?.uniforms.amount).toBe(90);
    expect(engine.findModule("fx").props).toEqual({ amount: 0 });
  });

  it("clamps the sum of several control routes to the prop's schema range", () => {
    const engine = withAudioProp(chain());
    engine.addRoute({ ...control, inMax: 1000, outMax: 360 });
    engine.setControls({ "patch:osc:frequency": 1000 });
    engine.tick({ now: 0, dt: 0 });

    expect(engine.passes()[1]?.uniforms.amount).toBe(360);
  });

  it("resolves control routes into a control module's props before ticking it", () => {
    const engine = chain();
    engine.addModule({
      id: "ap",
      name: "ap",
      moduleType: VideoModuleType.AudioProp,
      props: { moduleId: "osc", prop: "frequency" },
    });
    engine.addModule({
      id: "lfo",
      name: "lfo",
      moduleType: VideoModuleType.LFO,
      props: { frequency: 1 },
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "ap", ioName: "out" },
      destination: { moduleId: "lfo", ioName: "frequency" },
      inMin: 0,
      inMax: 4,
      outMin: 0,
      outMax: 4,
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "lfo", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    engine.setControls({ "patch:osc:frequency": 2 });
    engine.tick({ now: 0.125, dt: 0.125 });

    expect(engine.passes()[1]?.uniforms.amount).toBeCloseTo(360);
    expect(engine.findModule("lfo").props).toMatchObject({ frequency: 1 });
  });

  it("keeps its own copy of spectrum bins and feeds them to a Band", () => {
    const engine = chain();
    engine.addModule({
      id: "band",
      name: "band",
      moduleType: VideoModuleType.Band,
      props: { moduleId: "sp", lowHz: 0, highHz: 1000 },
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "band", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    const bins = new Float32Array([-30, -100, -65, -100]);
    engine.setSpectrum("sp", bins, 8000);
    bins.fill(-100);
    engine.tick({ now: 0, dt: 0 });

    expect(engine.passes()[1]?.uniforms.amount).toBeCloseTo(180);
  });

  it("updates props", () => {
    const engine = chain();
    engine.updateProps("fx", { amount: 45 });

    expect(engine.findModule("fx").props).toEqual({ amount: 45 });
  });

  it("removing a module drops routes on either end", () => {
    const engine = withAudioProp(chain());
    engine.removeModule("ap");
    expect(engine.serialize().routes.map((r) => r.kind)).toEqual([
      "texture",
      "texture",
    ]);

    engine.removeModule("fx");
    expect(engine.serialize().routes).toEqual([]);
    expect(engine.passes()[0]?.inputs).toEqual({ in: null });
  });

  it("round-trips through serialize and load", () => {
    const engine = withAudioProp(chain());
    const patch = engine.serialize();

    const loaded = new VideoEngine();
    loaded.load(patch);

    expect(loaded.serialize()).toEqual(patch);
  });

  it("loads a patch saved before route kinds and without bindings", () => {
    const patch = chain().serialize();
    const legacy = {
      modules: patch.modules,
      routes: patch.routes.map(({ kind: _kind, ...route }) => route),
      bindings: [{ id: "b", moduleId: "fx", prop: "amount" }],
    };

    const loaded = new VideoEngine();
    loaded.load(legacy as unknown as typeof patch);

    expect(loaded.serialize()).toEqual(patch);
  });

  it("rejects a route to an unknown module", () => {
    expect(() =>
      chain().addRoute({
        source: { moduleId: "src", ioName: "out" },
        destination: { moduleId: "nope", ioName: "in" },
      }),
    ).toThrow(/nope/);
  });

  it("rejects a texture route from a control output", () => {
    const engine = withAudioProp(chain());

    expect(() =>
      engine.addRoute({
        source: { moduleId: "ap", ioName: "out" },
        destination: { moduleId: "out", ioName: "in" },
      }),
    ).toThrow(/texture/);
  });

  it("rejects a control route from a texture output", () => {
    const engine = chain();

    expect(() =>
      engine.addRoute({
        ...control,
        source: { moduleId: "src", ioName: "out" },
      }),
    ).toThrow(/control/);
  });

  it("rejects a control route into a prop the module does not declare", () => {
    const engine = withAudioProp(chain());

    expect(() =>
      engine.addRoute({
        ...control,
        destination: { moduleId: "src", ioName: "mode" },
      }),
    ).toThrow(/mode/);
  });
});
