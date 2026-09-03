import { describe, expect, it } from "vitest";
import { VideoEngine } from "@/VideoEngine";
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

const binding = {
  id: "b",
  moduleId: "fx",
  prop: "amount",
  control: "spectrum:low",
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

  it("applies bindings from controls when building passes", () => {
    const engine = chain();
    engine.setBinding(binding);
    engine.setControls({ "spectrum:low": 0.25 });

    expect(engine.passes()[1]?.uniforms.amount).toBe(90);
    expect(engine.findModule("fx").props).toEqual({ amount: 0 });
  });

  it("updates props", () => {
    const engine = chain();
    engine.updateProps("fx", { amount: 45 });

    expect(engine.findModule("fx").props).toEqual({ amount: 45 });
  });

  it("removing a module drops its routes and bindings", () => {
    const engine = chain();
    engine.setBinding(binding);
    engine.removeModule("fx");

    expect(engine.serialize().routes).toEqual([]);
    expect(engine.serialize().bindings).toEqual([]);
    expect(engine.passes()[0]?.inputs).toEqual({ in: null });
  });

  it("round-trips through serialize and load", () => {
    const engine = chain();
    engine.setBinding(binding);
    const patch = engine.serialize();

    const loaded = new VideoEngine();
    loaded.load(patch);

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
});
