import { describe, expect, it } from "vitest";
import { VideoModule } from "@/core/Module";
import { Routes } from "@/core/Routes";
import { applyControlRoutes } from "@/core/controls";
import { buildPasses, readsOf } from "@/core/graph";
import { resolveInstances } from "@/core/instances";
import { createModule, VideoModuleType } from "@/modules";

function make(id: string, moduleType: VideoModuleType) {
  return createModule({ id, name: id, moduleType });
}

function graph(modules: VideoModule[]) {
  return new Map(modules.map((m) => [m.id, m]));
}

function wire(routes: Routes, from: string, to: string, ioName = "in") {
  routes.addRoute({
    source: { moduleId: from, ioName: "out" },
    destination: { moduleId: to, ioName },
  });
}

const stored = (m: VideoModule) => m.props as Record<string, unknown>;

const shape = (passes: ReturnType<typeof buildPasses>) =>
  passes.map((p) => [p.target, p.inputs, p.compose] as const);

describe("buildPasses", () => {
  it("orders passes so inputs come before consumers, output last", () => {
    const src = make("src", VideoModuleType.Source);
    const fx = make("fx", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([out, fx, src]), routes, stored);

    expect(passes.map((p) => p.moduleId)).toEqual(["src", "fx", "out"]);
    expect(passes[1]?.inputs).toEqual({ in: "src" });
    expect(passes[0]?.uniforms).toEqual({
      mode: 0,
      hue: 0,
      saturation: 1,
      lightness: 0.5,
      spread: 180,
      instances: 1,
    });
  });

  it("renders an instanced source once per instance and mixes it as a grid for a single consumer", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 3 });
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "out");

    const passes = buildPasses(graph([src, out]), routes, stored);

    expect(shape(passes)).toEqual([
      ["src:0", {}, undefined],
      ["src:1", {}, undefined],
      ["src:2", {}, undefined],
      ["src:mix", { in: "src" }, { instances: 3, layout: "grid" }],
      ["out", { in: "src:mix" }, undefined],
    ]);
    expect(passes[0]?.instance).toBe(0);
    expect(passes[0]?.uniforms.instances).toBe(3);
  });

  it("runs an instanced effect once per instance, reading the matching instance", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 2 });
    const fx = make("fx", VideoModuleType.HueRotate);
    fx.updateProps({ instances: 2 });
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([src, fx, out]), routes, stored);

    expect(shape(passes)).toEqual([
      ["src:0", {}, undefined],
      ["src:1", {}, undefined],
      ["fx:0", { in: "src:0" }, undefined],
      ["fx:1", { in: "src:1" }, undefined],
      ["fx:mix", { in: "fx" }, { instances: 2, layout: "grid" }],
      ["out", { in: "fx:mix" }, undefined],
    ]);
  });

  it("runs a single effect once on the grid of an instanced source", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 2 });
    const fx = make("fx", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([src, fx, out]), routes, stored);

    expect(shape(passes)).toEqual([
      ["src:0", {}, undefined],
      ["src:1", {}, undefined],
      ["src:mix", { in: "src" }, { instances: 2, layout: "grid" }],
      ["fx", { in: "src:mix" }, undefined],
      ["out", { in: "fx" }, undefined],
    ]);
  });

  it("mixes an instanced source once for several single consumers", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 2 });
    const a = make("a", VideoModuleType.HueRotate);
    const b = make("b", VideoModuleType.HueRotate);
    const merge = make("merge", VideoModuleType.Merge);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "a");
    wire(routes, "src", "b");
    wire(routes, "a", "merge", "a");
    wire(routes, "b", "merge", "b");
    wire(routes, "merge", "out");

    const passes = buildPasses(graph([src, a, b, merge, out]), routes, stored);

    expect(passes.filter((p) => p.compose)).toHaveLength(1);
    expect(passes.find((p) => p.moduleId === "a")?.inputs).toEqual({
      in: "src:mix",
    });
    expect(passes.find((p) => p.moduleId === "b")?.inputs).toEqual({
      in: "src:mix",
    });
  });

  it("composes at a Layout with its own layout instead of the grid mix", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 2 });
    const layout = make("layout", VideoModuleType.Layout);
    layout.updateProps({ layout: "strips" });
    const fx = make("fx", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "layout");
    wire(routes, "layout", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([src, layout, fx, out]), routes, stored);

    expect(shape(passes)).toEqual([
      ["src:0", {}, undefined],
      ["src:1", {}, undefined],
      ["layout", { in: "src" }, { instances: 2, layout: "strips" }],
      ["fx", { in: "layout" }, undefined],
      ["out", { in: "fx" }, undefined],
    ]);
  });

  it("feeds a single input to every instance and wraps a narrower instanced input", () => {
    const a = make("a", VideoModuleType.Source);
    a.updateProps({ instances: 4 });
    const b = make("b", VideoModuleType.Source);
    b.updateProps({ instances: 2 });
    const single = make("single", VideoModuleType.Source);
    const merge = make("merge", VideoModuleType.Merge);
    merge.updateProps({ instances: 4 });
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "a", "merge", "a");
    wire(routes, "b", "merge", "b");
    wire(routes, "merge", "out");

    const first = buildPasses(graph([a, b, merge, out]), routes, stored);

    expect(
      first
        .filter((p) => p.moduleId === "merge" && !p.compose)
        .map((p) => p.inputs),
    ).toEqual([
      { a: "a:0", b: "b:0" },
      { a: "a:1", b: "b:1" },
      { a: "a:2", b: "b:0" },
      { a: "a:3", b: "b:1" },
    ]);

    const fx = make("fx", VideoModuleType.Merge);
    fx.updateProps({ instances: 2 });
    routes.removeRoute(
      routes.serialize().find((r) => r.destination.moduleId === "out")!.id,
    );
    wire(routes, "merge", "fx", "a");
    wire(routes, "single", "fx", "b");
    wire(routes, "fx", "out");

    const second = buildPasses(
      graph([a, b, single, merge, fx, out]),
      routes,
      stored,
    );

    expect(
      second
        .filter((p) => p.moduleId === "fx" && !p.compose)
        .map((p) => p.inputs),
    ).toEqual([
      { a: "merge:0", b: "single" },
      { a: "merge:1", b: "single" },
    ]);
  });

  it("gives a single source the first instance of an instanced control, and an instanced source each its own", () => {
    const src = make("src", VideoModuleType.Source);
    const env = make("env", VideoModuleType.Envelope);
    env.updateProps({ instances: 2 });
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "out");
    routes.addRoute({
      kind: "control",
      source: { moduleId: "env", ioName: "out" },
      destination: { moduleId: "src", ioName: "hue" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    const modules = graph([src, env, out]);
    const values = new Map([
      ["env:out:0", 0.25],
      ["env:out:1", 0.5],
    ]);
    const build = () => {
      const counts = resolveInstances(modules, stored);
      const resolve = (m: VideoModule, instance: number) =>
        applyControlRoutes(
          stored(m),
          routes.controlRoutesFor(m.id),
          values,
          m.schema,
          instance,
          counts,
        );

      return buildPasses(modules, routes, resolve, counts).filter(
        (p) => p.moduleId === "src" && !p.compose,
      );
    };

    expect(build().map((p) => [p.instance, p.uniforms.hue])).toEqual([
      [undefined, 90],
    ]);

    src.updateProps({ instances: 2 });

    expect(build().map((p) => [p.instance, p.uniforms.hue])).toEqual([
      [0, 90],
      [1, 180],
    ]);
  });

  it("keeps a Feedback pass's output and feeds it back as prev, per instance", () => {
    const src = make("src", VideoModuleType.Source);
    const fb = make("fb", VideoModuleType.Feedback);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "fb");
    wire(routes, "fb", "out");

    const single = buildPasses(graph([src, fb, out]), routes, stored);

    expect(single[1]).toMatchObject({
      target: "fb",
      inputs: { in: "src", prev: "fb:prev" },
      keep: true,
    });
    expect(single[2]?.keep).toBeUndefined();

    fb.updateProps({ instances: 2 });
    const twice = buildPasses(graph([src, fb, out]), routes, stored);

    expect(twice[2]).toMatchObject({
      target: "fb:1",
      inputs: { in: "src", prev: "fb:1:prev" },
      keep: true,
    });
  });

  it("maps a missing input to null and skips modules not reaching an output", () => {
    const out = make("out", VideoModuleType.Output);
    const orphan = make("orphan", VideoModuleType.Source);

    const passes = buildPasses(graph([out, orphan]), new Routes(), stored);

    expect(passes.map((p) => p.moduleId)).toEqual(["out"]);
    expect(passes[0]?.inputs).toEqual({ in: null });
  });

  it("returns no passes without an output module", () => {
    const modules = graph([make("src", VideoModuleType.Source)]);

    expect(buildPasses(modules, new Routes(), stored)).toEqual([]);
  });

  it("visits both inputs of a combiner", () => {
    const a = make("a", VideoModuleType.Source);
    const b = make("b", VideoModuleType.Source);
    const merge = make("merge", VideoModuleType.Merge);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "a", "merge", "a");
    wire(routes, "b", "merge", "b");
    wire(routes, "merge", "out");

    const passes = buildPasses(graph([out, merge, b, a]), routes, stored);

    expect(passes.map((p) => p.moduleId)).toEqual(["a", "b", "merge", "out"]);
    expect(passes[2]?.inputs).toEqual({ a: "a", b: "b" });
  });

  it("throws on a cycle", () => {
    const a = make("a", VideoModuleType.HueRotate);
    const b = make("b", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "a", "b");
    wire(routes, "b", "a");
    wire(routes, "b", "out");

    expect(() => buildPasses(graph([a, b, out]), routes, stored)).toThrow(
      /cycle/,
    );
  });

  it("uses the resolved props, not the stored ones", () => {
    const src = make("src", VideoModuleType.Source);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "out");

    const passes = buildPasses(graph([src, out]), routes, (m) => ({
      ...stored(m),
      hue: 90,
    }));

    expect(passes[0]?.uniforms.hue).toBe(90);
  });
});

describe("readsOf", () => {
  const base = { moduleType: VideoModuleType.HueRotate, uniforms: {} };

  it("lists the plugged inputs of a shader pass", () => {
    expect(
      readsOf({
        ...base,
        moduleId: "fx",
        target: "fx",
        inputs: { a: "src:1", b: null },
      }),
    ).toEqual(["src:1"]);
  });

  it("lists every instance a compose pass tiles", () => {
    expect(
      readsOf({
        ...base,
        moduleId: "fx",
        target: "fx:mix",
        inputs: { in: "fx" },
        compose: { instances: 2, layout: "grid" },
      }),
    ).toEqual(["fx:0", "fx:1"]);
  });
});
