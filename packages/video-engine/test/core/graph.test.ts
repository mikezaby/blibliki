import { describe, expect, it } from "vitest";
import { VideoModule } from "@/core/Module";
import { Routes } from "@/core/Routes";
import { applyControlRoutes } from "@/core/controls";
import { buildPasses, readsOf, targetKey } from "@/core/graph";
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

  it("renders one pass per instance, and the output composes them as a grid", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 3 });
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "out");

    const passes = buildPasses(graph([src, out]), routes, stored);

    expect(passes.map((p) => [p.moduleId, p.instance])).toEqual([
      ["src", 0],
      ["src", 1],
      ["src", 2],
      ["out", undefined],
    ]);
    expect(passes[0]?.uniforms.instances).toBe(3);
    expect(passes[3]).toMatchObject({
      inputs: { in: "src" },
      compose: { instances: 3, layout: "grid" },
    });
  });

  it("carries instances through an effect so it runs once per instance", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ instances: 2 });
    const fx = make("fx", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([src, fx, out]), routes, stored);

    expect(passes.map((p) => [p.moduleId, p.instance])).toEqual([
      ["src", 0],
      ["src", 1],
      ["fx", 0],
      ["fx", 1],
      ["out", undefined],
    ]);
    expect(passes[2]?.inputs).toEqual({ in: "src:0" });
    expect(passes[3]?.inputs).toEqual({ in: "src:1" });
    expect(passes[4]?.compose).toEqual({ instances: 2, layout: "grid" });
  });

  it("composes at a Layout with its layout, and the rest runs once", () => {
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

    expect(passes.map((p) => [p.moduleId, p.instance])).toEqual([
      ["src", 0],
      ["src", 1],
      ["layout", undefined],
      ["fx", undefined],
      ["out", undefined],
    ]);
    expect(passes[2]).toMatchObject({
      inputs: { in: "src" },
      compose: { instances: 2, layout: "strips" },
    });
    expect(passes[3]).toMatchObject({ inputs: { in: "layout" } });
    expect(passes[3]?.compose).toBeUndefined();
    expect(passes[4]?.compose).toBeUndefined();
  });

  it("renders a single source once per instance of the instanced control driving it", () => {
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
    const instanceCounts = resolveInstances(modules, routes, stored);
    const resolve = (m: VideoModule, instance: number) =>
      applyControlRoutes(
        stored(m),
        routes.controlRoutesFor(m.id),
        values,
        m.schema,
        instance,
        instanceCounts,
      );

    const passes = buildPasses(modules, routes, resolve, instanceCounts);

    expect(passes.map((p) => [p.moduleId, p.instance, p.uniforms.hue])).toEqual(
      [
        ["src", 0, 90],
        ["src", 1, 180],
        ["out", undefined, undefined],
      ],
    );
    expect(passes[2]?.compose).toEqual({ instances: 2, layout: "grid" });
  });

  it("feeds a single input to every instance and wraps a narrower instanced input", () => {
    const a = make("a", VideoModuleType.Source);
    a.updateProps({ instances: 4 });
    const b = make("b", VideoModuleType.Source);
    b.updateProps({ instances: 2 });
    const c = make("c", VideoModuleType.HueRotate);
    const single = make("single", VideoModuleType.Source);
    const merge = make("merge", VideoModuleType.Merge);
    const fx = make("fx", VideoModuleType.Merge);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "a", "merge", "a");
    wire(routes, "b", "c");
    wire(routes, "c", "merge", "b");
    wire(routes, "merge", "fx", "a");
    wire(routes, "single", "fx", "b");
    wire(routes, "fx", "out");

    const passes = buildPasses(
      graph([a, b, c, single, merge, fx, out]),
      routes,
      stored,
    );

    expect(
      passes.filter((p) => p.moduleId === "merge").map((p) => p.inputs),
    ).toEqual([
      { a: "a:0", b: "c:0" },
      { a: "a:1", b: "c:1" },
      { a: "a:2", b: "c:0" },
      { a: "a:3", b: "c:1" },
    ]);
    expect(
      passes.filter((p) => p.moduleId === "fx").map((p) => p.inputs),
    ).toEqual([
      { a: "merge:0", b: "single" },
      { a: "merge:1", b: "single" },
      { a: "merge:2", b: "single" },
      { a: "merge:3", b: "single" },
    ]);
    expect(passes.filter((p) => p.compose)).toHaveLength(1);
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

describe("readsOf and targetKey", () => {
  const base = { moduleType: VideoModuleType.HueRotate, uniforms: {} };

  it("names a instance pass target by module and instance", () => {
    expect(targetKey({ ...base, moduleId: "fx", inputs: {} })).toBe("fx");
    expect(
      targetKey({ ...base, moduleId: "fx", inputs: {}, instance: 2 }),
    ).toBe("fx:2");
  });

  it("lists the plugged inputs of a shader pass", () => {
    expect(
      readsOf({ ...base, moduleId: "fx", inputs: { a: "src:1", b: null } }),
    ).toEqual(["src:1"]);
  });

  it("lists every instance a compose pass tiles", () => {
    expect(
      readsOf({
        ...base,
        moduleId: "out",
        inputs: { in: "fx" },
        compose: { instances: 2, layout: "grid" },
      }),
    ).toEqual(["fx:0", "fx:1"]);
  });
});
