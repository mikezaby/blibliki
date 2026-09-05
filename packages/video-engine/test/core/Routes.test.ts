import { describe, expect, it } from "vitest";
import { Routes } from "@/core/Routes";

describe("Routes", () => {
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
