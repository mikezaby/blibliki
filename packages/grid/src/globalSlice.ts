import { Engine, TransportState } from "@blibliki/engine";
import { createSlice } from "@reduxjs/toolkit";
import { updatePlainModule } from "@/components/AudioModule/modulesSlice";
import { initialize as patchInitialize, loadById } from "@/patchSlice";
import { AppDispatch, RootState } from "@/store";

interface IContext {
  latencyHint: "interactive" | "playback";
  lookAhead?: number;
}

interface GlobalProps {
  isInitialized: boolean;
  isStarted: boolean;
  context: IContext;
  bpm: number;
}

const initialState: GlobalProps = {
  isInitialized: false,
  isStarted: false,
  context: { latencyHint: "interactive", lookAhead: 0.05 },
  bpm: 120,
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setAttributes: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});

export const initialize =
  (patchId?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const { context: contextConf, bpm } = getState().global;

    const context = new AudioContext(contextConf);
    const engine = new Engine(context);
    await engine.initialize();
    engine.bpm = bpm;
    Engine.current = engine;

    if (patchId) {
      dispatch(loadById(patchId));
    } else {
      dispatch(patchInitialize());
    }

    //engine.onPropsUpdate((id, props) => {
    //dispatch(updatePlainModule({ id, changes: { props } }));
    //});

    return dispatch(
      setAttributes({
        isInitialized: true,
        isStarted: engine.transport.state === TransportState.playing,
        bpm: engine.bpm,
      }),
    );
  };

export const start = () => (dispatch: AppDispatch) => {
  Engine.current.start();
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

export const dispose = () => () => {
  Engine.current.stop();
};

export const { setAttributes } = globalSlice.actions;

export default globalSlice.reducer;
