import { Engine, TransportState } from "@blibliki/engine";
import { initializeFirebase } from "@blibliki/models";
import { Context, requestAnimationFrame } from "@blibliki/utils";
import { AudioContext } from "@blibliki/utils/web-audio-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { loadById } from "@/patchSlice";
import { AppDispatch, RootState } from "@/store";
import { updatePlainModule } from "./components/AudioModule/modulesSlice";
import { createEnginePropsUpdateQueue } from "./global/enginePropsUpdateQueue";

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
  (patchId = "new") =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    initializeFirebase(firebaseConfig);

    const { context: contextConf, bpm } = getState().global;

    const audioContext = new AudioContext(contextConf);
    const context = new Context(audioContext);
    const engine = new Engine(context);
    await engine.initialize();
    engine.bpm = bpm;

    void dispatch(loadById(patchId));

    const queue = createEnginePropsUpdateQueue();
    let scheduledFlush: number | null = null;

    const flushQueuedUpdates = () => {
      scheduledFlush = null;
      const state = getState();
      const modulesById = state.modules.entities;
      const modulePropsById = state.moduleProps.entities;
      const moduleStateById = state.moduleState.entities;

      queue.sweep(Object.keys(modulesById));
      const updates = queue.flush();

      updates.forEach((queuedUpdate) => {
        const currentModule = modulesById[queuedUpdate.id];
        if (!currentModule) return;

        const nextChanges = {
          ...queuedUpdate.changes,
        };

        if (
          nextChanges.name !== undefined &&
          currentModule.name === nextChanges.name
        ) {
          delete nextChanges.name;
        }

        if (
          nextChanges.props !== undefined &&
          modulePropsById[queuedUpdate.id]?.props === nextChanges.props
        ) {
          delete nextChanges.props;
        }

        if (
          nextChanges.state !== undefined &&
          moduleStateById[queuedUpdate.id]?.state === nextChanges.state
        ) {
          delete nextChanges.state;
        }

        if (
          nextChanges.voices !== undefined &&
          "voices" in currentModule &&
          currentModule.voices === nextChanges.voices
        ) {
          delete nextChanges.voices;
        }

        if (Object.keys(nextChanges).length === 0) return;
        dispatch(
          updatePlainModule({
            id: queuedUpdate.id,
            changes: nextChanges,
          }),
        );
      });
    };

    engine.onPropsUpdate((update) => {
      const enqueued = queue.enqueue({
        id: update.id,
        name: update.name,
        props: update.props,
        state: update.state,
        voices: "voices" in update ? update.voices : undefined,
      });

      if (!enqueued || scheduledFlush !== null) return;
      scheduledFlush = requestAnimationFrame(flushQueuedUpdates);
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
