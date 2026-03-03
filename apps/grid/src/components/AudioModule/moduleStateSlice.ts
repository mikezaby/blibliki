import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { ModuleSerializedState } from "./modulesSlice";

export type ModuleStateEntity = {
  id: string;
  state?: ModuleSerializedState;
};

const moduleStateAdapter = createEntityAdapter<ModuleStateEntity>();

export const moduleStateSlice = createSlice({
  name: "moduleState",
  initialState: moduleStateAdapter.getInitialState(),
  reducers: {
    addModuleState: (state, action: PayloadAction<ModuleStateEntity>) =>
      moduleStateAdapter.addOne(state, action.payload),
    updateModuleState: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Pick<ModuleStateEntity, "state">>;
      }>,
    ) => moduleStateAdapter.updateOne(state, action.payload),
    removeModuleState: (state, action: PayloadAction<string>) =>
      moduleStateAdapter.removeOne(state, action.payload),
    removeAllModuleState: (state) => moduleStateAdapter.removeAll(state),
  },
});

export const {
  addModuleState,
  updateModuleState,
  removeModuleState,
  removeAllModuleState,
} = moduleStateSlice.actions;

export const moduleStateSelector = moduleStateAdapter.getSelectors(
  (state: RootState) => state.moduleState,
);

export default moduleStateSlice.reducer;
