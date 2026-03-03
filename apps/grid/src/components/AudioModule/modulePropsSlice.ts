import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { ModuleSerializedProps } from "./modulesSlice";

export type ModulePropsEntity = {
  id: string;
  props: ModuleSerializedProps;
};

const modulePropsAdapter = createEntityAdapter<ModulePropsEntity>();

export const modulePropsSlice = createSlice({
  name: "moduleProps",
  initialState: modulePropsAdapter.getInitialState(),
  reducers: {
    addModuleProps: (state, action: PayloadAction<ModulePropsEntity>) =>
      modulePropsAdapter.addOne(state, action.payload),
    updateModuleProps: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Pick<ModulePropsEntity, "props">>;
      }>,
    ) => modulePropsAdapter.updateOne(state, action.payload),
    removeModuleProps: (state, action: PayloadAction<string>) =>
      modulePropsAdapter.removeOne(state, action.payload),
    removeAllModuleProps: (state) => modulePropsAdapter.removeAll(state),
  },
});

export const {
  addModuleProps,
  updateModuleProps,
  removeModuleProps,
  removeAllModuleProps,
} = modulePropsSlice.actions;

export const modulePropsSelector = modulePropsAdapter.getSelectors(
  (state: RootState) => state.moduleProps,
);

export default modulePropsSlice.reducer;
