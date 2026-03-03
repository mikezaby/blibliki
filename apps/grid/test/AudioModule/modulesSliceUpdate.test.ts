// @vitest-environment node
import { Engine, ModuleType } from "@blibliki/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updateModule } from "../../src/components/AudioModule/modulesSlice";

type DispatchedAction = {
  type: string;
  payload?: unknown;
};

const createThunkAwareDispatch = () => {
  const actions: DispatchedAction[] = [];

  const dispatch = ((action: unknown) => {
    if (typeof action === "function") {
      return (
        action as (dispatch: (dispatchedAction: unknown) => unknown) => unknown
      )(dispatch);
    }

    actions.push(action as DispatchedAction);
    return action;
  }) as (action: unknown) => unknown;

  return { actions, dispatch };
};

describe("updateModule", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches only module props update when only props are requested", () => {
    const nextProps = { gain: 0.65 };
    const engineUpdateModule = vi.fn().mockReturnValue({
      id: "gain-1",
      name: "Gain",
      moduleType: ModuleType.Gain,
      voiceNo: 0,
      props: nextProps,
      inputs: [],
      outputs: [],
    });

    vi.spyOn(Engine, "current", "get").mockReturnValue({
      updateModule: engineUpdateModule,
    } as unknown as Engine);

    const { actions, dispatch } = createThunkAwareDispatch();

    updateModule({
      id: "gain-1",
      moduleType: ModuleType.Gain,
      changes: { props: nextProps },
    })(dispatch as never);

    expect(actions).toEqual([
      {
        type: "moduleProps/updateModuleProps",
        payload: { id: "gain-1", changes: { props: nextProps } },
      },
    ]);
  });

  it("dispatches only module info update when only name is requested", () => {
    const engineUpdateModule = vi.fn().mockReturnValue({
      id: "gain-1",
      name: "Renamed Gain",
      moduleType: ModuleType.Gain,
      voiceNo: 0,
      props: { gain: 0.25 },
      inputs: [],
      outputs: [],
    });

    vi.spyOn(Engine, "current", "get").mockReturnValue({
      updateModule: engineUpdateModule,
    } as unknown as Engine);

    const { actions, dispatch } = createThunkAwareDispatch();

    updateModule({
      id: "gain-1",
      moduleType: ModuleType.Gain,
      changes: { name: "Renamed Gain" },
    })(dispatch as never);

    expect(actions).toEqual([
      {
        type: "modules/updateModuleInfo",
        payload: { id: "gain-1", changes: { name: "Renamed Gain" } },
      },
    ]);
  });
});
