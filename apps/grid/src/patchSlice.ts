import { Engine, type IAnyModuleSerialize } from "@blibliki/engine";
import { IPatch, Instrument, Patch } from "@blibliki/models";
import { Context, requestAnimationFrame } from "@blibliki/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  addModule,
  ModuleProps,
  modulesSelector,
  removeAllModules,
  updatePlainModule,
} from "@/components/AudioModule/modulesSlice";
import {
  hydrateEngineRoutes,
  removeAllGridNodes,
  setGridNodes,
} from "@/components/Grid/gridNodesSlice";
import { addNotification } from "@/notificationsSlice";
import { assertPatchPayloadHasNoUndefined } from "@/patch/patchPayloadValidation";
import type { PatchViewMode } from "@/patch/viewMode";
import { AppDispatch, RootState } from "@/store";
import { createEnginePropsUpdateQueue } from "./global/enginePropsUpdateQueue";
import {
  bindTransportState,
  setAttributes as setGlobalAttributes,
  setBpm,
} from "./globalSlice";
import { createInstrumentDebugPatch } from "./instruments/debugPatch";

type PatchProps = {
  patch: Omit<IPatch, "config">;
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
};

type PatchLoadOptions = {
  viewMode?: PatchViewMode;
};

const initialState: PatchProps = {
  patch: { id: "", userId: "", name: "Init patch" },
  status: "idle",
};

export const patchSlice = createSlice({
  name: "Patch",
  initialState,
  reducers: {
    setAttributes: (state, action: PayloadAction<PatchProps>) => {
      return { ...state, ...action.payload };
    },
    setName: (state, action: PayloadAction<string>) => {
      state.patch.name = action.payload;
    },
  },
});

export const loadById =
  (id: string, options: PatchLoadOptions = {}) =>
  async (dispatch: AppDispatch) => {
    try {
      await dispatch(clearEngine());
      await dispatch(initializeEngine());

      const patch = id === "new" ? Patch.build() : await Patch.find(id);

      dispatch(load(patch, options));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to load patch",
          message: errorMessage,
          duration: 5000,
        }),
      );

      throw error;
    }
  };

export const loadInstrumentDebugById =
  (id: string) => async (dispatch: AppDispatch) => {
    try {
      await dispatch(clearEngine());
      await dispatch(initializeEngine());

      const instrument = await Instrument.find(id);
      dispatch(load(createInstrumentDebugPatch(instrument.serialize())));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to load instrument debug view",
          message: errorMessage,
          duration: 5000,
        }),
      );

      throw error;
    }
  };

export const load =
  (patch: Patch | IPatch, options: PatchLoadOptions = {}) =>
  (dispatch: AppDispatch) => {
    const { id, name, config, userId } = patch;
    const { bpm, modules, gridNodes } = config;

    dispatch(loadModules(modules as ModuleProps[]));

    if (options.viewMode === "runtime") {
      hydrateEngineRoutes(gridNodes);
    } else {
      dispatch(setGridNodes(gridNodes));
    }

    dispatch(setBpm(bpm));

    dispatch(
      setAttributes({ patch: { id, name, userId }, status: "succeeded" }),
    );
  };

export const save =
  (props: { userId: string; asNew: boolean }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const { asNew } = props;
    const state = getState();
    const { patch: originalPatch } = state.patch;
    const modules = modulesSelector.selectAll(state).flatMap((moduleInfo) => {
      const moduleProps = state.moduleProps.entities[moduleInfo.id]?.props;
      if (moduleProps === undefined) return [];

      return [{ ...moduleInfo, props: moduleProps } as IAnyModuleSerialize];
    });
    const gridNodes = state.gridNodes;
    const bpm = state.global.bpm;
    const config = { bpm, modules, gridNodes };

    try {
      const id = asNew ? undefined : originalPatch.id;
      const userId = id ? originalPatch.userId : props.userId;
      const documentPath = id ? `patches/${id}` : "patches/<new>";
      const payload = { userId, name: originalPatch.name, config };

      try {
        assertPatchPayloadHasNoUndefined(payload, { documentPath });
      } catch (error) {
        console.warn(
          "[PatchSave] Continuing save because Firestore is configured with ignoreUndefinedProperties=true.",
          error,
        );
      }

      const patch = new Patch({ id, ...payload });
      await patch.save();

      dispatch(
        addNotification({
          type: "success",
          title: asNew ? "Patch saved as copy" : "Patch saved successfully",
          message: `"${originalPatch.name}" has been saved.`,
          duration: 3000,
        }),
      );

      void dispatch(loadById(patch.id));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to save patch",
          message: errorMessage,
          duration: 5000,
        }),
      );

      throw error;
    }
  };

export const destroy =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const { patch } = state.patch;
    if (!patch.id) throw Error("This patch isn't saved yet");

    try {
      const patchName = patch.name;
      await (await Patch.find(patch.id)).delete();

      dispatch(
        addNotification({
          type: "success",
          title: "Patch deleted successfully",
          message: `"${patchName}" has been deleted.`,
          duration: 3000,
        }),
      );

      await dispatch(clearEngine());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      dispatch(
        addNotification({
          type: "error",
          title: "Failed to delete patch",
          message: errorMessage,
          duration: 5000,
        }),
      );

      throw error;
    }
  };

export const { setAttributes, setName } = patchSlice.actions;

const initializeEngine =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const { context: contextConf, bpm } = getState().global;

    const context = new Context(contextConf);
    const engine = new Engine(context);
    await engine.initialize();
    engine.bpm = bpm;

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

    dispatch(bindTransportState(engine));

    dispatch(
      setGlobalAttributes({
        engineId: engine.id,
        isInitialized: true,
        bpm: engine.bpm,
      }),
    );

    return engine;
  };

export const clearEngine = () => async (dispatch: AppDispatch) => {
  try {
    await disposeEngine(Engine.current);
  } catch {
    // No engine initialized yet.
  }
  dispatch(
    setGlobalAttributes({
      engineId: "",
      isInitialized: false,
      isStarted: false,
    }),
  );
  dispatch(removeAllModules());
  dispatch(removeAllGridNodes());
};

const disposeEngine = async (engine: Engine) => {
  engine.dispose();

  try {
    await engine.context.close();
  } catch {
    // Context may already be closed or unavailable in mocked environments.
  }
};

const loadModules = (modules: ModuleProps[]) => (dispatch: AppDispatch) => {
  modules.forEach((m) => {
    dispatch(addModule({ audioModule: m }));
  });
};

export default patchSlice.reducer;
