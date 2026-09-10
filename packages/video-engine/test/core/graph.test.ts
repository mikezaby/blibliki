import { describe, expect, it } from "vitest";
import { VideoModule } from "@/core/Module";
import { Routes } from "@/core/Routes";
import { buildPasses, readsOf, targetKey } from "@/core/graph";
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
      voices: 1,
    });
  });

  it("renders one pass per voice, and the output composes them as a grid", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ voices: 3 });
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "out");

    const passes = buildPasses(graph([src, out]), routes, stored);

    expect(passes.map((p) => [p.moduleId, p.voice])).toEqual([
      ["src", 0],
      ["src", 1],
      ["src", 2],
      ["out", undefined],
    ]);
    expect(passes[0]?.uniforms.voices).toBe(3);
    expect(passes[3]).toMatchObject({
      inputs: { in: "src" },
      compose: { voices: 3, layout: "grid" },
    });
  });

  it("carries voices through an effect so it runs once per voice", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ voices: 2 });
    const fx = make("fx", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([src, fx, out]), routes, stored);

    expect(passes.map((p) => [p.moduleId, p.voice])).toEqual([
      ["src", 0],
      ["src", 1],
      ["fx", 0],
      ["fx", 1],
      ["out", undefined],
    ]);
    expect(passes[2]?.inputs).toEqual({ in: "src:0" });
    expect(passes[3]?.inputs).toEqual({ in: "src:1" });
    expect(passes[4]?.compose).toEqual({ voices: 2, layout: "grid" });
  });

  it("composes at a Layout with its layout, and the rest runs once", () => {
    const src = make("src", VideoModuleType.Source);
    src.updateProps({ voices: 2 });
    const layout = make("layout", VideoModuleType.Layout);
    layout.updateProps({ layout: "strips" });
    const fx = make("fx", VideoModuleType.HueRotate);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "src", "layout");
    wire(routes, "layout", "fx");
    wire(routes, "fx", "out");

    const passes = buildPasses(graph([src, layout, fx, out]), routes, stored);

    expect(passes.map((p) => [p.moduleId, p.voice])).toEqual([
      ["src", 0],
      ["src", 1],
      ["layout", undefined],
      ["fx", undefined],
      ["out", undefined],
    ]);
    expect(passes[2]).toMatchObject({
      inputs: { in: "src" },
      compose: { voices: 2, layout: "strips" },
    });
    expect(passes[3]).toMatchObject({ inputs: { in: "layout" } });
    expect(passes[3]?.compose).toBeUndefined();
    expect(passes[4]?.compose).toBeUndefined();
  });

  it("feeds a mono input to every voice and wraps a narrower poly input", () => {
    const a = make("a", VideoModuleType.Source);
    a.updateProps({ voices: 4 });
    const b = make("b", VideoModuleType.Source);
    b.updateProps({ voices: 2 });
    const c = make("c", VideoModuleType.HueRotate);
    const mono = make("mono", VideoModuleType.Source);
    const merge = make("merge", VideoModuleType.Merge);
    const fx = make("fx", VideoModuleType.Merge);
    const out = make("out", VideoModuleType.Output);
    const routes = new Routes();
    wire(routes, "a", "merge", "a");
    wire(routes, "b", "c");
    wire(routes, "c", "merge", "b");
    wire(routes, "merge", "fx", "a");
    wire(routes, "mono", "fx", "b");
    wire(routes, "fx", "out");

    const passes = buildPasses(
      graph([a, b, c, mono, merge, fx, out]),
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
      { a: "merge:0", b: "mono" },
      { a: "merge:1", b: "mono" },
      { a: "merge:2", b: "mono" },
      { a: "merge:3", b: "mono" },
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

  it("names a voice pass target by module and voice", () => {
    expect(targetKey({ ...base, moduleId: "fx", inputs: {} })).toBe("fx");
    expect(targetKey({ ...base, moduleId: "fx", inputs: {}, voice: 2 })).toBe(
      "fx:2",
    );
  });

  it("lists the plugged inputs of a shader pass", () => {
    expect(
      readsOf({ ...base, moduleId: "fx", inputs: { a: "src:1", b: null } }),
    ).toEqual(["src:1"]);
  });

  it("lists every voice a compose pass tiles", () => {
    expect(
      readsOf({
        ...base,
        moduleId: "out",
        inputs: { in: "fx" },
        compose: { voices: 2, layout: "grid" },
      }),
    ).toEqual(["fx:0", "fx:1"]);
  });
});
