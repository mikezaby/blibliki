// @vitest-environment node
import { Engine } from "@blibliki/engine";
import { describe, expect, it, vi } from "vitest";
import { loadById } from "../../src/patchSlice";

const { patchBuildMock } = vi.hoisted(() => ({
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
  it("should bootstrap engine lifecycle state when loading a new patch", async () => {
    const dispose = vi.fn();
    let bpm = 120;

    vi.spyOn(Engine, "current", "get").mockReturnValue({
      dispose,
      get bpm() {
        return bpm;
      },
      set bpm(value: number) {
        bpm = value;
      },
    } as unknown as Engine);

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
