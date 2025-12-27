import { IPatch, Patch } from "@blibliki/models";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  addModule,
  ModuleProps,
  modulesSelector,
  removeAllModules,
} from "@/components/AudioModule/modulesSlice";
import {
  removeAllGridNodes,
  setGridNodes,
} from "@/components/Grid/gridNodesSlice";
import { addNotification } from "@/notificationsSlice";
import { AppDispatch, RootState } from "@/store";
import { dispose, setBpm } from "./globalSlice";

type PatchProps = {
  patch: Omit<IPatch, "config">;
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
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

export const initialize = () => (dispatch: AppDispatch) => {
  dispatch(setAttributes(initialState));
};

export const loadById = (id: string) => async (dispatch: AppDispatch) => {
  if (id === "new") {
    dispatch(clearEngine());
    dispatch(initialize());
    return;
  }

  try {
    const patch = await Patch.find(id);
    dispatch(load(patch));
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

export const load = (patch: Patch | IPatch) => (dispatch: AppDispatch) => {
  const { id, name, config, userId } = patch;
  const { bpm = 120, modules, gridNodes } = config;

  dispatch(clearEngine());
  dispatch(loadModules(modules));
  dispatch(setGridNodes(gridNodes));
  dispatch(setBpm(bpm));

  dispatch(setAttributes({ patch: { id, name, userId }, status: "succeeded" }));
};

export const save =
  (props: { userId: string; asNew: boolean }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const { asNew } = props;
    const state = getState();
    const { patch: originalPatch } = state.patch;
    const modules = modulesSelector.selectAll(state);
    const gridNodes = state.gridNodes;
    const bpm = state.global.bpm;
    const config = { bpm, modules, gridNodes };

    try {
      const id = asNew ? undefined : originalPatch.id;
      const userId = id ? originalPatch.userId : props.userId;
      const patch = new Patch({ id, userId, name: originalPatch.name, config });
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

      dispatch(clearEngine());
      dispatch(initialize());
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

const clearEngine = () => (dispatch: AppDispatch) => {
  dispatch(dispose());
  dispatch(removeAllModules());
  dispatch(removeAllGridNodes());
};

const loadModules = (modules: ModuleProps[]) => (dispatch: AppDispatch) => {
  modules.forEach((m) => {
    dispatch(addModule({ audioModule: m }));
  });
};

export default patchSlice.reducer;
