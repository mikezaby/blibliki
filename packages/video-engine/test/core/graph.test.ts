import { describe, expect, it } from "vitest";
import { VideoModule } from "@/core/Module";
import { Routes } from "@/core/Routes";
import { buildPasses } from "@/core/graph";
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
