import { describe, expect, it } from "vitest";
import { Routes } from "@/core/Routes";

describe("Routes", () => {
  it("accumulates MIDI routes into one input", () => {
    const routes = new Routes();
    const into = (moduleId: string) =>
      routes.addRoute({
        kind: "midi",
        source: { moduleId, ioName: "midi out" },
        destination: { moduleId: "env", ioName: "in" },
      });
    into("keys");
    into("seq");

    expect(routes.serialize().map((r) => r.source.moduleId)).toEqual([
      "keys",
      "seq",
    ]);
  });

  it("adds a route with a generated id", () => {
    const routes = new Routes();
    const route = routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(route.id).toBeTypeOf("string");
    expect(routes.serialize()).toEqual([route]);
  });

  it("replaces a route into an occupied input", () => {
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });
    const second = routes.addRoute({
      source: { moduleId: "c", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(routes.serialize()).toEqual([second]);
  });

  it("removes every route touching a module", () => {
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });
    const kept = routes.addRoute({
      source: { moduleId: "c", ioName: "out" },
      destination: { moduleId: "d", ioName: "in" },
    });

    routes.removeForModule("a");

    expect(routes.serialize()).toEqual([kept]);
  });

  it("defaults a route without a kind to texture", () => {
    const routes = new Routes();
    const route = routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(route.kind).toBe("texture");
  });

  it("keeps several control routes into one prop", () => {
    const routes = new Routes();
    const first = routes.addRoute({
      kind: "control",
      source: { moduleId: "lfo", ioName: "out" },
      destination: { moduleId: "b", ioName: "hue" },
    });
    const second = routes.addRoute({
      kind: "control",
      source: { moduleId: "band", ioName: "out" },
      destination: { moduleId: "b", ioName: "hue" },
    });

    expect(routes.serialize()).toEqual([first, second]);
    expect(routes.controlRoutesFor("b")).toEqual([first, second]);
    expect(routes.controlRoutesFor("lfo")).toEqual([]);
  });

  it("ignores control routes when finding a texture source", () => {
    const routes = new Routes();
    routes.addRoute({
      kind: "control",
      source: { moduleId: "lfo", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(routes.sourceFor("b", "in")).toBeNull();
  });

  it("finds the source plugged into an input", () => {
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(routes.sourceFor("b", "in")).toBe("a");
    expect(routes.sourceFor("b", "other")).toBeNull();
  });
});
