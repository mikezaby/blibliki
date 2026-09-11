import {
  createModule,
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
};

// Patches saved before route kinds have routes without `kind` and a
// `bindings` list, which is dropped.
export type SavedVideoPatch = {
  modules?: IVideoModule[];
  routes?: (Omit<IRoute, "kind"> & { kind?: IRoute["kind"] })[];
};

export const VIDEO_MODULE_NAMES: Record<VideoModuleType, string> = {
  [VideoModuleType.Source]: "Source",
  [VideoModuleType.HueRotate]: "Hue Rotate",
  [VideoModuleType.Color]: "Color",
  [VideoModuleType.Transform]: "Transform",
  [VideoModuleType.Mirror]: "Mirror",
  [VideoModuleType.Merge]: "Merge",
  [VideoModuleType.Layout]: "Layout",
  [VideoModuleType.Output]: "Visuals",
  [VideoModuleType.AudioProp]: "Audio Prop",
  [VideoModuleType.LFO]: "LFO",
  [VideoModuleType.Envelope]: "Envelope",
  [VideoModuleType.Band]: "Band",
  [VideoModuleType.MidiNotes]: "MIDI Notes",
};

const samePlug = (a: IRoute["destination"], b: IRoute["destination"]) =>
  a.moduleId === b.moduleId && a.ioName === b.ioName;

export const videoPatchSlice = createSlice({
  name: "videoPatch",
  initialState: EMPTY_VIDEO_PATCH,
  reducers: {
    setVideoPatch: (_, action: PayloadAction<SavedVideoPatch>) => ({
      modules: action.payload.modules ?? [],
      routes: (action.payload.routes ?? []).map((route) => ({
        ...route,
        kind: route.kind ?? "texture",
      })),
    }),
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
    },
    updateVideoModuleProps: (
      state,
      action: PayloadAction<{ id: string; props: Record<string, unknown> }>,
    ) => {
      const module = state.modules.find((m) => m.id === action.payload.id);
      if (module) Object.assign(module.props, action.payload.props);
    },
    // A texture route replaces the one into the same input; control routes
    // into one prop accumulate. Re-adding an id replaces that route.
    addVideoRoute: (state, action: PayloadAction<IRoute>) => {
      const route = action.payload;
      state.routes = state.routes.filter(
        (r) =>
          r.id !== route.id &&
          !(
            route.kind === "texture" &&
            r.kind === "texture" &&
            samePlug(r.destination, route.destination)
          ),
      );
      state.routes.push(route);
    },
    removeVideoRoute: (state, action: PayloadAction<string>) => {
      state.routes = state.routes.filter((r) => r.id !== action.payload);
    },
    updateVideoRoute: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Pick<IRoute, "inMin" | "inMax" | "outMin" | "outMax" | "exp">;
      }>,
    ) => {
      const route = state.routes.find((r) => r.id === action.payload.id);
      if (route) Object.assign(route, action.payload.changes);
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
  updateVideoRoute,
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
