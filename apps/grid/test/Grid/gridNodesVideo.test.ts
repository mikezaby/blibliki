// @vitest-environment node
import { Engine } from "@blibliki/engine";
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

function harness(edges: { id: string; source: string; target: string }[] = []) {
  const actions: Action[] = [];
  const getState = () =>
    ({
      gridNodes: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
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
