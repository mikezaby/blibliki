import {
  createModule,
  type IBinding,
  type IRoute,
  type IVideoModule,
  type IVideoPatch,
  VideoModuleType,
} from "@blibliki/video-engine";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { XYPosition } from "@xyflow/react";
import { addNode } from "@/components/Grid/gridNodesSlice";
import { addNotification } from "@/notificationsSlice";
import type { AppDispatch, RootState } from "@/store";

export const EMPTY_VIDEO_PATCH: IVideoPatch = {
  modules: [],
  routes: [],
  bindings: [],
};

export const VIDEO_MODULE_NAMES: Record<VideoModuleType, string> = {
  [VideoModuleType.Source]: "Source",
  [VideoModuleType.HueRotate]: "Hue Rotate",
  [VideoModuleType.Merge]: "Merge",
  [VideoModuleType.Output]: "Visuals",
};

const samePlug = (a: IRoute["destination"], b: IRoute["destination"]) =>
  a.moduleId === b.moduleId && a.ioName === b.ioName;

export const videoPatchSlice = createSlice({
  name: "videoPatch",
  initialState: EMPTY_VIDEO_PATCH,
  reducers: {
    setVideoPatch: (_, action: PayloadAction<IVideoPatch>) => action.payload,
    clearVideoPatch: () => EMPTY_VIDEO_PATCH,
    addVideoModule: (state, action: PayloadAction<IVideoModule>) => {
      state.modules.push(action.payload);
    },
    removeVideoModule: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.modules = state.modules.filter((m) => m.id !== id);
      state.routes = state.routes.filter(
        (r) => r.source.moduleId !== id && r.destination.moduleId !== id,
      );
      state.bindings = state.bindings.filter((b) => b.moduleId !== id);
    },
    updateVideoModuleProps: (
      state,
      action: PayloadAction<{ id: string; props: Record<string, unknown> }>,
    ) => {
      const module = state.modules.find((m) => m.id === action.payload.id);
      if (module) Object.assign(module.props, action.payload.props);
    },
    addVideoRoute: (state, action: PayloadAction<IRoute>) => {
      state.routes = state.routes.filter(
        (r) => !samePlug(r.destination, action.payload.destination),
      );
      state.routes.push(action.payload);
    },
    removeVideoRoute: (state, action: PayloadAction<string>) => {
      state.routes = state.routes.filter((r) => r.id !== action.payload);
    },
    setVideoBinding: (state, action: PayloadAction<IBinding>) => {
      state.bindings = state.bindings.filter((b) => b.id !== action.payload.id);
      state.bindings.push(action.payload);
    },
    removeVideoBinding: (state, action: PayloadAction<string>) => {
      state.bindings = state.bindings.filter((b) => b.id !== action.payload);
    },
    removeBindingsForAudioModule: (state, action: PayloadAction<string>) => {
      const prefixes = [
        `patch:${action.payload}:`,
        `spectrum:${action.payload}:`,
      ];
      state.bindings = state.bindings.filter(
        (b) => !prefixes.some((p) => b.control.startsWith(p)),
      );
    },
  },
});

export const {
  setVideoPatch,
  clearVideoPatch,
  addVideoModule,
  removeVideoModule,
  updateVideoModuleProps,
  addVideoRoute,
  removeVideoRoute,
  setVideoBinding,
  removeVideoBinding,
  removeBindingsForAudioModule,
} = videoPatchSlice.actions;

export const addNewVideoModule =
  (params: { type: VideoModuleType; position: XYPosition }) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const { type, position } = params;
    const hasOutput = getState().videoPatch.modules.some(
      (m) => m.moduleType === VideoModuleType.Output,
    );
    if (type === VideoModuleType.Output && hasOutput) {
      dispatch(
        addNotification({
          type: "warning",
          title: "One Visuals module per patch",
          message: "The patch already has a Visuals module.",
        }),
      );
      return;
    }

    const module = createModule({
      name: VIDEO_MODULE_NAMES[type],
      moduleType: type,
    }).serialize();
    dispatch(addVideoModule(module));
    dispatch(addNode({ id: module.id, type: "videoNode", position, data: {} }));
  };

export const selectVideoModule = (state: RootState, id: string) =>
  state.videoPatch.modules.find((m) => m.id === id);

export default videoPatchSlice.reducer;
