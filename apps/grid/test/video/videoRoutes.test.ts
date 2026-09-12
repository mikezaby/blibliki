// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it } from "vitest";
import {
  validVideoConnection,
  videoRouteFromConnection,
  withEdgeTypes,
  midiBridgeRoute,
} from "../../src/video/videoRoutes";

const osc = { id: "osc", name: "Osc", moduleType: ModuleType.Oscillator };
const audioProp = {
  id: "ap",
  name: "Freq",
  moduleType: VideoModuleType.AudioProp,
  props: { moduleId: "osc", prop: "frequency" },
};
const src = {
  id: "src",
  name: "Source",
  moduleType: VideoModuleType.Source,
  props: { mode: "solid", hue: 0, saturation: 1, lightness: 0.5, spread: 180 },
};
const fx = {
  id: "fx",
  name: "Hue Rotate",
  moduleType: VideoModuleType.HueRotate,
  props: { amount: 0 },
};
const modules = [audioProp, src, fx];

const connect = (
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
) => ({ source, sourceHandle, target, targetHandle });

describe("validVideoConnection", () => {
  it("accepts a texture output into a texture input", () => {
    expect(
      validVideoConnection(connect("src", "out", "fx", "in"), modules),
    ).toBe(true);
  });

  it("accepts a control output into a control input", () => {
    expect(
      validVideoConnection(connect("ap", "out", "fx", "amount"), modules),
    ).toBe(true);
  });

  it("refuses mixed kinds, self connections and undeclared ports", () => {
    expect(
      validVideoConnection(connect("ap", "out", "fx", "in"), modules),
    ).toBe(false);
    expect(
      validVideoConnection(connect("src", "out", "fx", "amount"), modules),
    ).toBe(false);
    expect(
      validVideoConnection(connect("fx", "out", "fx", "in"), modules),
    ).toBe(false);
    expect(
      validVideoConnection(connect("src", "out", "src", "mode"), modules),
    ).toBe(false);
  });
});

describe("withEdgeTypes", () => {
  it("tags edges of control routes so the canvas renders the control edge", () => {
    const edges = [
      { id: "t1", source: "src", target: "fx" },
      { id: "c1", source: "ap", target: "fx" },
      { id: "a1", source: "osc", target: "filter" },
    ];
    const routes = [
      {
        id: "t1",
        kind: "texture" as const,
        source: { moduleId: "src", ioName: "out" },
        destination: { moduleId: "fx", ioName: "in" },
      },
      {
        id: "c1",
        kind: "control" as const,
        source: { moduleId: "ap", ioName: "out" },
        destination: { moduleId: "fx", ioName: "amount" },
      },
    ];

    expect(withEdgeTypes(edges, routes).map((e) => e.type)).toEqual([
      undefined,
      "controlEdge",
      undefined,
    ]);
  });
});

describe("videoRouteFromConnection", () => {
  it("makes a texture route from a texture cable", () => {
    const route = videoRouteFromConnection(
      "t1",
      connect("src", "out", "fx", "in"),
      modules,
      [osc],
    );

    expect(route).toEqual({
      id: "t1",
      kind: "texture",
      source: { moduleId: "src", ioName: "out" },
      destination: { moduleId: "fx", ioName: "in" },
    });
  });

  it("makes a control route with the source's range and the target's schema range", () => {
    const route = videoRouteFromConnection(
      "c1",
      connect("ap", "out", "fx", "amount"),
      modules,
      [osc],
    );

    expect(route).toEqual({
      id: "c1",
      kind: "control",
      source: { moduleId: "ap", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 25000,
      outMin: 0,
      outMax: 360,
      exp: undefined,
    });
  });

  it("makes a bridged MIDI route from an audio MIDI output into a video MIDI input", () => {
    const env = {
      id: "env",
      name: "Envelope",
      moduleType: VideoModuleType.Envelope,
      props: { instances: 4 },
    };
    const keys = {
      id: "keys",
      name: "MIDI In",
      moduleType: ModuleType.MidiInput,
      outputs: [{ name: "midi out", ioType: "midiOutput" }],
    };
    const cable = (sourceHandle: string, targetHandle: string) =>
      midiBridgeRoute(
        "r",
        { source: "keys", sourceHandle, target: "env", targetHandle },
        [...modules, env],
        [keys],
      );

    expect(cable("midi out", "in")).toEqual({
      id: "r",
      kind: "midi",
      source: { moduleId: "keys", ioName: "midi out" },
      destination: { moduleId: "env", ioName: "in" },
    });
    expect(cable("midi out", "gate")).toBeNull();
    expect(cable("out", "in")).toBeNull();
  });

  it("uses the MIDI note range for a MIDI Notes note output", () => {
    const mv = {
      id: "mv",
      name: "MIDI Notes",
      moduleType: VideoModuleType.MidiNotes,
      props: { instances: 4 },
    };
    const route = videoRouteFromConnection(
      "r",
      {
        source: "mv",
        sourceHandle: "note",
        target: "fx",
        targetHandle: "amount",
      },
      [...modules, mv],
      [],
    );

    expect(route).toMatchObject({
      inMin: 0,
      inMax: 127,
      outMin: 0,
      outMax: 360,
    });
  });

  it("uses 0..1 for a control source with no audio prop behind it", () => {
    const bare = { ...audioProp, props: { moduleId: "", prop: "" } };
    const route = videoRouteFromConnection(
      "c1",
      connect("ap", "out", "src", "hue"),
      [bare, src],
      [],
    );

    expect(route).toMatchObject({ inMin: 0, inMax: 1, outMin: 0, outMax: 360 });
  });
});
