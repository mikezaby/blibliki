// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadById } from "../../src/patchSlice";

const { patchBuildMock, engineDisposeMock } = vi.hoisted(() => ({
  patchBuildMock: vi.fn(() => ({
    id: "",
    name: "Init patch",
    userId: "",
    config: {
      bpm: 120,
      modules: [],
      gridNodes: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  })),
  engineDisposeMock: vi.fn(),
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

    dispose(): void {
      engineDisposeMock();
    }

    static get current() {
      if (Engine.instance) return Engine.instance;
      return {
        dispose: engineDisposeMock,
        context: { close: vi.fn(async () => undefined) },
        bpm: 120,
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
    constructor(_audioContext?: unknown) {}
  },
  requestAnimationFrame: (_callback: () => void) => 1,
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
}));

type DispatchedAction = {
  type: string;
  payload?: unknown;
};

describe("patchSlice.loadById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should bootstrap engine lifecycle state when loading a new patch", async () => {
    const actions: DispatchedAction[] = [];
    const getState = () =>
      ({
        global: {
          context: { latencyHint: "interactive", lookAhead: 0.05 },
          bpm: 120,
        },
        modules: { entities: {} },
        moduleProps: { entities: {} },
        moduleState: { entities: {} },
      }) as never;

    const dispatch = ((action: unknown) => {
      if (typeof action === "function") {
        return (
          action as (
            thunkDispatch: (innerAction: unknown) => unknown,
            thunkGetState: () => unknown,
          ) => unknown
        )(dispatch, getState);
      }

      actions.push(action as DispatchedAction);
      return action;
    }) as (action: unknown) => unknown;

    await loadById("new")(dispatch as never);

    expect(patchBuildMock).toHaveBeenCalledTimes(1);
    expect(
      actions.some(
        (action) =>
          action.type === "global/setAttributes" &&
          (action.payload as Record<string, unknown>)?.isInitialized === true,
      ),
    ).toBe(true);
  });
});
