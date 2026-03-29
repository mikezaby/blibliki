// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import * as patchSlice from "../../src/patchSlice";

const {
  createInstrumentEnginePatchMock,
  instrumentFindMock,
  patchBuildMock,
  engineDisposeMock,
  engineAddModuleMock,
  engineAddRouteMock,
  contextConstructorMock,
} = vi.hoisted(() => ({
  createInstrumentEnginePatchMock: vi.fn(() => ({
    patch: {
      bpm: 126,
      timeSignature: [4, 4] as const,
      modules: [
        {
          id: "track-1.source.main",
          name: "Source",
          moduleType: "Oscillator",
          voiceNo: 0,
          inputs: [],
          outputs: [],
          props: {},
        },
        {
          id: "track-1.filter.main",
          name: "Filter",
          moduleType: "Filter",
          voiceNo: 0,
          inputs: [],
          outputs: [],
          props: {},
        },
        {
          id: "instrument.runtime.master",
          name: "Master",
          moduleType: "Master",
          voiceNo: 0,
          inputs: [],
          outputs: [],
          props: {},
        },
      ],
      routes: [
        {
          id: "route-1",
          source: { moduleId: "track-1.source.main", ioName: "out" },
          destination: { moduleId: "track-1.filter.main", ioName: "in" },
        },
        {
          id: "route-2",
          source: { moduleId: "track-1.filter.main", ioName: "out" },
          destination: {
            moduleId: "instrument.runtime.master",
            ioName: "in",
          },
        },
      ],
    },
  })),
  instrumentFindMock: vi.fn(async (id: string) => ({
    serialize: () => ({
      id,
      name: "Broken Instrument",
      userId: "user-1",
      document: {
        version: "1",
        name: "Broken Instrument",
        templateId: "default-performance-instrument",
        hardwareProfileId: "launchcontrolxl3-pi-lcd",
        globalBlock: {
          tempo: 126,
          swing: 0,
          masterFilterCutoff: 20_000,
          masterFilterResonance: 1,
          reverbSend: 0.3,
          delaySend: 0.3,
          masterVolume: 1,
        },
        tracks: [],
      },
    }),
  })),
  patchBuildMock: vi.fn((data: Record<string, unknown> = {}) => ({
    id: "",
    name: typeof data.name === "string" ? data.name : "Init patch",
    userId: typeof data.userId === "string" ? data.userId : "",
    config: {
      bpm:
        typeof (data.config as { bpm?: unknown } | undefined)?.bpm === "number"
          ? ((data.config as { bpm: number }).bpm ?? 120)
          : 120,
      modules: Array.isArray(
        (data.config as { modules?: unknown[] } | undefined)?.modules,
      )
        ? (((data.config as { modules: unknown[] }).modules ?? []) as unknown[])
        : [],
      gridNodes: ((
        data.config as
          | {
              gridNodes?: {
                nodes?: unknown[];
                edges?: unknown[];
                viewport?: { x?: number; y?: number; zoom?: number };
              };
            }
          | undefined
      )?.gridNodes as
        | {
            nodes?: unknown[];
            edges?: unknown[];
            viewport?: { x?: number; y?: number; zoom?: number };
          }
        | undefined) ?? {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  })),
  engineDisposeMock: vi.fn(),
  engineAddModuleMock: vi.fn((module) => module),
  engineAddRouteMock: vi.fn((route) => route),
  contextConstructorMock: vi.fn(),
}));

vi.mock("@blibliki/instrument", () => ({
  createInstrumentEnginePatch: createInstrumentEnginePatchMock,
}));

vi.mock("@blibliki/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@blibliki/engine")>();

  class Engine {
    static instance: Engine | null = null;

    id = "engine-1";
    bpm = 120;
    transport = {
      state: "stopped" as const,
      addPropertyChangeCallback: vi.fn(),
    };
    context = { close: vi.fn(async () => undefined) };

    constructor(_context: unknown) {
      Engine.instance = this;
    }

    async initialize(): Promise<void> {}

    onPropsUpdate(): void {}

    addModule(module: unknown) {
      return engineAddModuleMock(module);
    }

    addRoute(route: unknown) {
      return engineAddRouteMock(route);
    }

    dispose(): void {
      engineDisposeMock();
    }

    static get current() {
      if (Engine.instance) return Engine.instance;

      return {
        dispose: engineDisposeMock,
        context: { close: vi.fn(async () => undefined) },
        bpm: 120,
        addModule: engineAddModuleMock,
        addRoute: engineAddRouteMock,
      } as unknown as Engine;
    }
  }

  return {
    ...actual,
    Engine,
    TransportState: { playing: "playing" },
  };
});

vi.mock("@blibliki/utils", () => ({
  Context: class {
    constructor(contextConf?: unknown) {
      contextConstructorMock(contextConf);
    }
  },
  requestAnimationFrame: (callback: () => void) => {
    callback();
    return 1;
  },
}));

vi.mock("@blibliki/utils/web-audio-api", () => ({
  AudioContext: class {
    constructor(_contextConf?: unknown) {}
  },
}));

vi.mock("@blibliki/models", () => ({
  Patch: {
    build: patchBuildMock,
    find: vi.fn(),
  },
  Instrument: {
    find: instrumentFindMock,
  },
}));

type DispatchedAction = {
  type: string;
  payload?: unknown;
};

describe("patchSlice.loadInstrumentDebugById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    contextConstructorMock.mockClear();
  });

  const createHarness = () => {
    const state = {
      global: {
        context: { latencyHint: "interactive", lookAhead: 0.05 },
        bpm: 120,
      },
      modules: { entities: {} },
      moduleProps: { entities: {} },
      moduleState: { entities: {} },
    };
    const actions: DispatchedAction[] = [];
    const getState = () => state as never;

    const dispatch = ((action: unknown) => {
      if (typeof action === "function") {
        return (
          action as (
            thunkDispatch: (innerAction: unknown) => unknown,
            thunkGetState: () => unknown,
          ) => unknown
        )(dispatch, getState);
      }

      const typedAction = action as DispatchedAction;
      actions.push(typedAction);

      if (typedAction.type === "global/setAttributes" && typedAction.payload) {
        state.global = {
          ...state.global,
          ...(typedAction.payload as Partial<typeof state.global>),
        };
      }

      return action;
    }) as (action: unknown) => unknown;

    return { actions, dispatch, getState };
  };

  it("loads an instrument into Grid as a transient patch with seeded nodes for post-render layout", async () => {
    const { actions, dispatch, getState } = createHarness();

    await patchSlice.loadInstrumentDebugById?.("instrument-1")(
      dispatch as never,
      getState,
    );

    expect(instrumentFindMock).toHaveBeenCalledWith("instrument-1");
    expect(createInstrumentEnginePatchMock).toHaveBeenCalledTimes(1);

    const gridNodesAction = actions.find(
      (action) => action.type === "gridNodes/setGridNodes",
    );

    expect(gridNodesAction).toBeDefined();

    const gridNodes = (gridNodesAction?.payload ?? {}) as {
      nodes: Array<{ id: string; position: { x: number; y: number } }>;
      edges: Array<{
        id: string;
        source: string;
        sourceHandle: string;
        target: string;
        targetHandle: string;
      }>;
      viewport: { x: number; y: number; zoom: number };
    };

    expect(gridNodes.nodes).toHaveLength(3);
    expect(gridNodes.edges).toEqual([
      {
        id: "route-1",
        source: "track-1.source.main",
        sourceHandle: "out",
        target: "track-1.filter.main",
        targetHandle: "in",
      },
      {
        id: "route-2",
        source: "track-1.filter.main",
        sourceHandle: "out",
        target: "instrument.runtime.master",
        targetHandle: "in",
      },
    ]);
    expect(gridNodes.nodes).toEqual([
      {
        data: {},
        id: "track-1.source.main",
        position: { x: 0, y: 0 },
        type: "audioNode",
      },
      {
        data: {},
        id: "track-1.filter.main",
        position: { x: 0, y: 48 },
        type: "audioNode",
      },
      {
        data: {},
        id: "instrument.runtime.master",
        position: { x: 0, y: 96 },
        type: "audioNode",
      },
    ]);
    expect(gridNodes.viewport).toEqual({ x: 0, y: 0, zoom: 1 });

    const patchAction = actions.find(
      (action) => action.type === "Patch/setAttributes",
    );

    expect(patchAction).toBeDefined();
    expect(
      (patchAction?.payload as { patch: { name: string } }).patch.name,
    ).toBe("Debug: Broken Instrument");
  });

  it("boots the debug engine with the instrument latency hint", async () => {
    instrumentFindMock.mockResolvedValueOnce({
      serialize: () => ({
        id: "instrument-1",
        name: "Broken Instrument",
        userId: "user-1",
        document: {
          version: "1",
          name: "Broken Instrument",
          templateId: "default-performance-instrument",
          hardwareProfileId: "launchcontrolxl3-pi-lcd",
          latencyHint: "playback",
          globalBlock: {
            tempo: 126,
            swing: 0,
            masterFilterCutoff: 20_000,
            masterFilterResonance: 1,
            reverbSend: 0.3,
            delaySend: 0.3,
            masterVolume: 1,
          },
          tracks: [],
        },
      }),
    });

    const { dispatch, getState } = createHarness();

    await patchSlice.loadInstrumentDebugById?.("instrument-1")(
      dispatch as never,
      getState,
    );

    expect(contextConstructorMock).toHaveBeenCalledWith({
      latencyHint: "playback",
      lookAhead: 0.05,
    });
  });
});
