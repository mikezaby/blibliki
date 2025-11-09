import { Engine, TransportState } from "@blibliki/engine";
import { Context } from "@blibliki/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initialize as patchInitialize, loadById } from "@/patchSlice";
import { AppDispatch, RootState } from "@/store";
import { updatePlainModule } from "./components/AudioModule/modulesSlice";

type IContext = {
  latencyHint: "interactive" | "playback";
  lookAhead?: number;
};

type GlobalProps = {
  engineId: string;
  isInitialized: boolean;
  isStarted: boolean;
  context: IContext;
  bpm: number;
};

const initialState: GlobalProps = {
  engineId: "",
  isInitialized: false,
  isStarted: false,
  context: { latencyHint: "interactive", lookAhead: 0.05 },
  bpm: 120,
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setAttributes: (state, action: PayloadAction<Partial<GlobalProps>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const initialize =
  (patchId?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const { context: contextConf, bpm } = getState().global;

    const audioContext = new AudioContext(contextConf);
    const context = new Context(audioContext);
    const engine = new Engine(context);
    await engine.initialize();
    engine.bpm = bpm;

    if (patchId) {
      void dispatch(loadById(patchId));
    } else {
      dispatch(patchInitialize());
    }

    engine.onPropsUpdate(({ id, props }) => {
      dispatch(updatePlainModule({ id, changes: { props } }));
    });

    return dispatch(
      setAttributes({
        engineId: engine.id,
        isInitialized: true,
        isStarted: engine.transport.state === TransportState.playing,
        bpm: engine.bpm,
      }),
    );
  };

export const start = () => async (dispatch: AppDispatch) => {
  await Engine.current.start();
  dispatch(setAttributes({ isStarted: true }));
};

export const stop = () => (dispatch: AppDispatch) => {
  Engine.current.stop();
  dispatch(setAttributes({ isStarted: false }));
};

export const setBpm = (bpm: number) => (dispatch: AppDispatch) => {
  Engine.current.bpm = bpm;
  dispatch(setAttributes({ bpm }));
};

export const dispose = () => (dispatch: AppDispatch) => {
  Engine.current.dispose();
  dispatch(setAttributes({ isStarted: false }));
};

export const { setAttributes } = globalSlice.actions;

export default globalSlice.reducer;
