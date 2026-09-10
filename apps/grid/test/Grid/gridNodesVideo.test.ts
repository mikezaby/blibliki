// @vitest-environment node
import { Engine } from "@blibliki/engine";
import { VideoModuleType } from "@blibliki/video-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  connect,
  hydrateEngineRoutes,
  onEdgesChange,
  onNodesChange,
} from "../../src/components/Grid/gridNodesSlice";

type Action = { type: string; payload?: unknown };

const nodes = [
  { id: "osc", type: "audioNode", position: { x: 0, y: 0 }, data: {} },
  { id: "src", type: "videoNode", position: { x: 0, y: 0 }, data: {} },
  { id: "fx", type: "videoNode", position: { x: 0, y: 0 }, data: {} },
];

const videoModules = [
  { id: "src", name: "src", moduleType: VideoModuleType.Source, props: {} },
  { id: "fx", name: "fx", moduleType: VideoModuleType.HueRotate, props: {} },
];

const keys = {
  id: "keys",
  name: "keys",
  moduleType: "MidiInput",
  outputs: [{ name: "midi out", ioType: "midiOutput" }],
};

function harness(edges: { id: string; source: string; target: string }[] = []) {
  const actions: Action[] = [];
  const getState = () =>
    ({
      gridNodes: {
        nodes: [
          ...nodes,
          { id: "keys", type: "audioNode", position: { x: 0, y: 0 }, data: {} },
          { id: "env", type: "videoNode", position: { x: 0, y: 0 }, data: {} },
        ],
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      videoPatch: {
        modules: [
          ...videoModules,
          {
            id: "env",
            name: "env",
            moduleType: VideoModuleType.Envelope,
            props: {},
          },
        ],
        routes: [],
      },
      modules: { ids: ["keys"], entities: { keys } },
    }) as never;
  const dispatch = (action: unknown) => {
    if (typeof action === "function") {
      return (action as (d: typeof dispatch, g: typeof getState) => unknown)(
        dispatch,
        getState,
      );
    }
    actions.push(action as Action);
    return action;
  };
  return { actions, dispatch, getState };
}

describe("gridNodes video branching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connect between video nodes adds a video route and an edge, not an engine route", () => {
    const addRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({
      addRoute,
    } as unknown as Engine);
    const { actions, dispatch, getState } = harness();

    connect({
      source: "src",
      sourceHandle: "out",
      target: "fx",
      targetHandle: "in",
    })(dispatch as never, getState);

    expect(addRoute).not.toHaveBeenCalled();
    expect(actions.map((a) => a.type)).toEqual([
      "videoPatch/addVideoRoute",
      "gridNodes/addEdge",
    ]);
  });

  it("connect from an audio MIDI output into a video MIDI input adds a bridged video route", () => {
    const addRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({
      addRoute,
    } as unknown as Engine);
    const { actions, dispatch, getState } = harness();

    connect({
      source: "keys",
      sourceHandle: "midi out",
      target: "env",
      targetHandle: "in",
    })(dispatch as never, getState);

    expect(addRoute).not.toHaveBeenCalled();
    expect(actions.map((a) => a.type)).toEqual([
      "videoPatch/addVideoRoute",
      "gridNodes/addEdge",
    ]);
    expect(actions[0]?.payload).toMatchObject({
      kind: "midi",
      source: { moduleId: "keys", ioName: "midi out" },
      destination: { moduleId: "env", ioName: "in" },
    });
  });

  it("removing a bridged edge removes the video route, not an engine route", () => {
    const removeRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({
      removeRoute,
    } as unknown as Engine);
    const { actions, dispatch, getState } = harness([
      { id: "b1", source: "keys", target: "env" },
    ]);

    onEdgesChange([{ type: "remove", id: "b1" }])(dispatch as never, getState);

    expect(removeRoute).not.toHaveBeenCalled();
    expect(actions.map((a) => a.type)).toEqual([
      "videoPatch/removeVideoRoute",
      "gridNodes/applyEdgeChanges",
    ]);
  });

  it("removing a video edge removes the video route, not an engine route", () => {
    const removeRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({
      removeRoute,
    } as unknown as Engine);
    const { actions, dispatch, getState } = harness([
      { id: "e1", source: "src", target: "fx" },
    ]);

    onEdgesChange([{ type: "remove", id: "e1" }])(dispatch as never, getState);

    expect(removeRoute).not.toHaveBeenCalled();
    expect(actions.map((a) => a.type)).toEqual([
      "videoPatch/removeVideoRoute",
      "gridNodes/applyEdgeChanges",
    ]);
  });

  it("removing a video node removes the video module", () => {
    const { actions, dispatch, getState } = harness();

    onNodesChange([{ type: "remove", id: "src" }])(dispatch as never, getState);

    expect(actions.map((a) => a.type)).toEqual([
      "gridNodes/setNodes",
      "videoPatch/removeVideoModule",
    ]);
  });

  it("hydrateEngineRoutes skips video edges", () => {
    const addRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({
      addRoute,
    } as unknown as Engine);

    hydrateEngineRoutes({
      nodes,
      edges: [
        {
          id: "e1",
          source: "src",
          sourceHandle: "out",
          target: "fx",
          targetHandle: "in",
        },
        {
          id: "e2",
          source: "osc",
          sourceHandle: "out",
          target: "osc",
          targetHandle: "in",
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(addRoute).toHaveBeenCalledTimes(1);
    expect(addRoute.mock.calls[0]?.[0]).toMatchObject({ id: "e2" });
  });
});
