import { configureStore } from "@reduxjs/toolkit";
import midiDevicesReducer from "@/components/AudioModule/MidiDeviceSelector/midiDevicesSlice";
import modulesReducer from "@/components/AudioModule/modulesSlice";
import gridNodesReducer from "@/components/Grid/gridNodesSlice";
import modalReducer from "@/components/Modal/modalSlice";
import devicesReducer from "@/devicesSlice";
import globalReducer from "@/globalSlice";
import notificationsReducer from "@/notificationsSlice";
import patchReducer from "@/patchSlice";

export const store = configureStore({
  reducer: {
    global: globalReducer,
    midiDevices: midiDevicesReducer,
    modules: modulesReducer,
    modal: modalReducer,
    gridNodes: gridNodesReducer,
    patch: patchReducer,
    devices: devicesReducer,
    notifications: notificationsReducer,
  },
  devTools: true,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
