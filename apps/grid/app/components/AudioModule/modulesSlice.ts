import {
  Engine,
  IIOSerialize,
  IModule,
  IUpdateModule,
  ModuleType,
} from "@blibliki/engine";
import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
} from "@reduxjs/toolkit";
import { XYPosition } from "@xyflow/react";
import { addNode } from "@/components/Grid/gridNodesSlice";
import { AppDispatch, RootState } from "@/store";
import { Optional } from "@/types";

interface ModuleInterface extends Omit<IModule<ModuleType>, "id" | "voiceNo"> {
  voices?: number;
}

export interface ModuleProps extends ModuleInterface {
  id: string;
  inputs: IIOSerialize[];
  outputs: IIOSerialize[];
}

export const AvailableModules: Record<
  ModuleType,
  Optional<ModuleInterface, "props">
> = {
  [ModuleType.Master]: { name: "Master", moduleType: ModuleType.Master },
  [ModuleType.Oscillator]: {
    name: "Oscillator",
    moduleType: ModuleType.Oscillator,
  },
  [ModuleType.Envelope]: { name: "Envelope", moduleType: ModuleType.Envelope },
  [ModuleType.Filter]: { name: "Filter", moduleType: ModuleType.Filter },
  [ModuleType.Gain]: { name: "Gain", moduleType: ModuleType.Gain },
  [ModuleType.MidiSelector]: {
    name: "Midi Selector",
    moduleType: ModuleType.MidiSelector,
  },
  [ModuleType.Scale]: { name: "Scale", moduleType: ModuleType.Scale },
  [ModuleType.Inspector]: {
    name: "Inspector",
    moduleType: ModuleType.Inspector,
  },
  [ModuleType.Constant]: { name: "Constant", moduleType: ModuleType.Constant },
  [ModuleType.VirtualMidi]: {
    name: "Keyboard",
    moduleType: ModuleType.VirtualMidi,
  },
  [ModuleType.StepSequencer]: {
    name: "StepSequencer",
    moduleType: ModuleType.StepSequencer,
  },
};

const modulesAdapter = createEntityAdapter<ModuleProps>({});

export const modulesSlice = createSlice({
  name: "modules",
  initialState: modulesAdapter.getInitialState(),
  reducers: {
    addModule: (state, action) => modulesAdapter.addOne(state, action),
    updateModule: (state, update: PayloadAction<IUpdateModule<ModuleType>>) => {
      const {
        id,
        moduleType: _,
        ...changes
      } = Engine.current.updateModule(update.payload);
      return modulesAdapter.updateOne(state, {
        id,
        changes,
      });
    },
    removeModule: (state, action) => modulesAdapter.removeOne(state, action),
    updatePlainModule: (state, action) =>
      modulesAdapter.updateOne(state, action),
    removeAllModules: (state) => modulesAdapter.removeAll(state),
  },
});

const { addModule: _addModule } = modulesSlice.actions;

export const { updateModule, updatePlainModule, removeAllModules } =
  modulesSlice.actions;

export const addModule =
  (params: { audioModule: ModuleInterface; position?: XYPosition }) =>
  (dispatch: AppDispatch) => {
    const { audioModule, position = { x: 0, y: 0 } } = params;
    const serializedModule = Engine.current.addModule(audioModule);
    dispatch(_addModule(serializedModule));

    dispatch(
      addNode({
        id: serializedModule.id,
        type: "audioNode",
        position,
        data: {},
      }),
    );
  };

export const addNewModule =
  (params: { type: ModuleType; position?: XYPosition }) =>
  (dispatch: AppDispatch) => {
    const { type, position } = params;
    const modulePayload = AvailableModules[type];
    dispatch(
      addModule({ audioModule: { props: {}, ...modulePayload }, position }),
    );
  };

export const removeModule =
  (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const audioModule = modulesSelector.selectById(getState(), id);
    if (!audioModule) throw Error(`Audio module with id ${id} not exists`);

    Engine.current.removeModule(id);
    dispatch(modulesSlice.actions.removeModule(id));
  };

export const modulesSelector = modulesAdapter.getSelectors(
  (state: RootState) => state.modules,
);

export default modulesSlice.reducer;
