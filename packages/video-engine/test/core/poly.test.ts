import { describe, expect, it } from "vitest";
import { Routes } from "@/core/Routes";
import { resolveVoices, voiceRect, voicesProp } from "@/core/poly";
import { createModule, VideoModuleType } from "@/modules";

describe("voiceRect", () => {
  it("fills a grid row-major from the top left", () => {
    expect(voiceRect(0, 4, "grid")).toEqual({
      x: 0,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    });
    expect(voiceRect(3, 4, "grid")).toEqual({
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 0.5,
    });
  });

  it("picks the squarest grid and leaves the tail of the last row empty", () => {
    expect(voiceRect(4, 5, "grid")).toEqual({
      x: 1 / 3,
      y: 0,
      width: 1 / 3,
      height: 0.5,
    });
  });

  it("stacks strips top to bottom", () => {
    expect(voiceRect(0, 3, "strips")).toEqual({
      x: 0,
      y: 1 - 1 / 3,
      width: 1,
      height: 1 / 3,
    });
  });
});

describe("voicesProp", () => {
  it("defaults to one and rounds a modulated count", () => {
    expect(voicesProp({})).toBe(1);
    expect(voicesProp({ voices: 0.2 })).toBe(1);
    expect(voicesProp({ voices: 8.6 })).toBe(9);
  });
});

describe("resolveVoices", () => {
  const make = (
    id: string,
    moduleType: VideoModuleType,
    props: Record<string, unknown> = {},
  ) => createModule({ id, name: id, moduleType, props });
  const texture = (routes: Routes, from: string, to: string) =>
    routes.addRoute({
      source: { moduleId: from, ioName: "out" },
      destination: { moduleId: to, ioName: "in" },
    });
  const control = (routes: Routes, from: string, to: string, prop: string) =>
    routes.addRoute({
      kind: "control",
      source: { moduleId: from, ioName: "out" },
      destination: { moduleId: to, ioName: prop },
    });

  it("follows texture and control routes and collapses at Layout and Output", () => {
    const modules = [
      make("src", VideoModuleType.Source, { voices: 3 }),
      make("fx", VideoModuleType.HueRotate),
      make("layout", VideoModuleType.Layout),
      make("post", VideoModuleType.HueRotate),
      make("out", VideoModuleType.Output),
      make("env", VideoModuleType.Envelope, { voices: 2 }),
      make("lfo", VideoModuleType.LFO),
    ];
    const routes = new Routes();
    texture(routes, "src", "fx");
    texture(routes, "fx", "layout");
    texture(routes, "layout", "post");
    texture(routes, "post", "out");
    control(routes, "env", "lfo", "frequency");
    control(routes, "lfo", "post", "amount");

    const voicings = resolveVoices(
      new Map(modules.map((m) => [m.id, m])),
      routes,
      (m) => m.props,
    );

    expect(Object.fromEntries(voicings)).toEqual({
      src: 3,
      fx: 3,
      layout: 1,
      post: 2,
      out: 1,
      env: 2,
      lfo: 2,
    });
  });

  it("counts a control feedback loop as mono where it closes", () => {
    const lfo = make("lfo", VideoModuleType.LFO);
    const routes = new Routes();
    control(routes, "lfo", "lfo", "frequency");

    const voicings = resolveVoices(
      new Map([["lfo", lfo]]),
      routes,
      (m) => m.props,
    );

    expect(voicings.get("lfo")).toBe(1);
  });
});
