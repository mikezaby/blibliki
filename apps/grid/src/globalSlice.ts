import { Engine } from "@blibliki/engine";
import { initializeFirebase, isFirebaseInitialized } from "@blibliki/models";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "@/store";

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

export const initialize = () => {
  if (isFirebaseInitialized()) return;
  initializeFirebase(firebaseConfig);
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

export const dispose = () => async (dispatch: AppDispatch) => {
  return disposeCurrentEngine().finally(() => {
    dispatch(
      setAttributes({ engineId: "", isInitialized: false, isStarted: false }),
    );
  });
};

export const { setAttributes } = globalSlice.actions;

export default globalSlice.reducer;

const disposeCurrentEngine = async () => {
  try {
    const engine = Engine.current;
    engine.dispose();
    await engine.context.close();
  } catch {
    // No engine initialized yet or context already closed.
  }
};
