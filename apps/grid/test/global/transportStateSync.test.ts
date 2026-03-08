// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  startMock,
  stopMock,
  addPropertyChangeCallbackMock,
  getTransportStateCallback,
} = vi.hoisted(() => {
  let transportStateCallback:
    | ((state: "playing" | "stopped" | "paused", actionAt: number) => void)
    | null = null;

  return {
    startMock: vi.fn(async () => undefined),
    stopMock: vi.fn(() => undefined),
    addPropertyChangeCallbackMock: vi.fn(
      (_property: string, callback: typeof transportStateCallback) => {
        transportStateCallback = callback;
      },
    ),
    getTransportStateCallback: () => transportStateCallback,
  };
});

vi.mock("@/patchSlice", () => ({
  loadById: vi.fn(() => ({ type: "patch/loadById" })),
}));

vi.mock("@blibliki/engine", () => {
  const TransportState = {
    playing: "playing",
    stopped: "stopped",
    paused: "paused",
  } as const;

  class Engine {
    static get current() {
      return {
        start: startMock,
        stop: stopMock,
        transport: {
          state: TransportState.stopped,
          addPropertyChangeCallback: addPropertyChangeCallbackMock,
        },
      };
    }
  }

  return {
    Engine,
    TransportState,
  };
});

vi.mock("@blibliki/models", () => ({
  initializeFirebase: vi.fn(),
  isFirebaseInitialized: vi.fn(() => false),
}));

type DispatchableAction =
  | {
      type: string;
      payload?: unknown;
    }
  | ((dispatch: (action: DispatchableAction) => unknown) => unknown);

const createDispatchRecorder = () => {
  const actions: { type: string; payload?: unknown }[] = [];

  const dispatch = (action: DispatchableAction) => {
    if (typeof action === "function") {
      return action(dispatch);
    }

    actions.push(action);
    return action;
  };

  return { dispatch, actions };
};

describe("globalSlice transport state sync", () => {
  beforeEach(() => {
    startMock.mockClear();
    stopMock.mockClear();
    addPropertyChangeCallbackMock.mockClear();
  });

  it("syncs isStarted from transport state callback", async () => {
    const { bindTransportState } = await import("../../src/globalSlice");
    const { Engine } = await import("@blibliki/engine");
    const { dispatch, actions } = createDispatchRecorder();

    bindTransportState(Engine.current as never)(dispatch as never);

    expect(addPropertyChangeCallbackMock).toHaveBeenCalledWith(
      "state",
      expect.any(Function),
    );
    expect(actions).toContainEqual({
      type: "global/setAttributes",
      payload: { isStarted: false },
    });

    actions.length = 0;
    const callback = getTransportStateCallback();
    expect(callback).toBeTypeOf("function");

    callback?.("playing", 0);

    expect(actions).toEqual([
      {
        type: "global/setAttributes",
        payload: { isStarted: true },
      },
    ]);
  });

  it("does not update isStarted directly in start and stop thunks", async () => {
    const { start, stop } = await import("../../src/globalSlice");
    const { dispatch, actions } = createDispatchRecorder();

    await start()(dispatch as never);
    stop()(dispatch as never);

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(actions).toEqual([]);
  });
});
