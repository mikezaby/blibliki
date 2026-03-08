// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { loadById } from "../../src/patchSlice";

const {
  patchBuildMock,
  engineEvents,
  resolveInitializeAt,
  currentEngine,
  initializeResolvers,
} = vi.hoisted(() => {
  const initializeResolvers: Array<() => void> = [];
  const engineEvents = {
    constructed: [] as string[],
    disposed: [] as string[],
    closed: [] as string[],
  };
  const currentEngine = {
    value: null as null | { id: string; dispose: () => void },
  };

  return {
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
    initializeResolvers,
    resolveInitializeAt: (index: number) => {
      const resolve = initializeResolvers[index];
      if (!resolve)
        throw new Error(`Missing initialize resolver at index ${index}`);
      resolve();
    },
    currentEngine,
    engineEvents,
  };
});

vi.mock("@blibliki/models", () => ({
  Patch: {
    build: patchBuildMock,
    find: vi.fn(),
  },
}));

vi.mock("@blibliki/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@blibliki/engine")>();
  let engineCount = 0;

  class Engine {
    id = `engine-${++engineCount}`;
    bpm = 120;
    transport = { state: "stopped" as const };
    context = {
      close: async () => {
        engineEvents.closed.push(this.id);
      },
    };

    constructor(_context: unknown) {
      engineEvents.constructed.push(this.id);
      currentEngine.value = this;
    }

    async initialize(): Promise<void> {
      await new Promise<void>((resolve) => {
        initializeResolvers.push(resolve);
      });
    }

    onPropsUpdate(): void {}

    dispose(): void {
      engineEvents.disposed.push(this.id);
    }

    addModule(module: Record<string, unknown>) {
      return {
        ...module,
        voiceNo: 0,
        inputs: [],
        outputs: [],
      };
    }

    static get current(): Engine {
      if (!currentEngine.value) throw new Error("No current engine");
      return currentEngine.value as Engine;
    }
  }

  return {
    ...actual,
    Engine,
  };
});

vi.mock("@blibliki/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@blibliki/utils")>();

  return {
    ...actual,
    Context: class {
      constructor(_audioContext: unknown) {}
    },
    requestAnimationFrame: (_callback: () => void) => 1,
  };
});

vi.mock("@blibliki/utils/web-audio-api", () => ({
  AudioContext: class {
    constructor(_context: unknown) {}
  },
}));

type DispatchedAction = {
  type: string;
  payload?: unknown;
};

describe("patchSlice.loadById concurrency", () => {
  it("should apply only the latest concurrent load result", async () => {
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

    const firstLoad = loadById("new")(dispatch as never);
    const secondLoad = loadById("new")(dispatch as never);

    await waitForInitializeResolvers(2);

    resolveInitializeAt(1);
    await secondLoad;

    resolveInitializeAt(0);
    await firstLoad;

    const patchSetAttributesActions = actions.filter(
      (action) => action.type === "Patch/setAttributes",
    );

    expect(patchBuildMock).toHaveBeenCalledTimes(1);
    expect(patchSetAttributesActions).toHaveLength(1);
    expect(engineEvents.disposed).toContain("engine-1");
    expect(engineEvents.closed).toContain("engine-1");
  });
});

const waitForInitializeResolvers = async (expectedCount: number) => {
  const timeoutAt = Date.now() + 200;
  while (initializeResolvers.length < expectedCount) {
    if (Date.now() > timeoutAt) {
      throw new Error(
        `Expected ${expectedCount} initialize resolvers, got ${initializeResolvers.length}`,
      );
    }
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  }
};
