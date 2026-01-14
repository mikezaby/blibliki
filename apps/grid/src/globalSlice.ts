import { Engine, TransportState } from "@blibliki/engine";
import { initializeFirebase } from "@blibliki/models";
import { Context } from "@blibliki/utils";
import { AudioContext } from "@blibliki/utils/web-audio-api";
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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
    initializeFirebase(firebaseConfig);

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

    engine.onPropsUpdate((update) => {
      const { id, props, state } = update;

      if ("voices" in update) {
        dispatch(
          updatePlainModule({
            id,
            changes: { voices: update.voices, props, state },
          }),
        );
      } else {
        dispatch(updatePlainModule({ id, changes: { props, state } }));
      }
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
