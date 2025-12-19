import {
  Engine,
  IAnyModuleSerialize,
  IModule,
  IUpdateModule,
  ModuleType,
} from "@blibliki/engine";
import { Optional } from "@blibliki/utils";
import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  createSelector,
} from "@reduxjs/toolkit";
import { XYPosition } from "@xyflow/react";
import { addNode } from "@/components/Grid/gridNodesSlice";
import { AppDispatch, RootState } from "@/store";

type ModuleInterface = {
  voices?: number;
} & Omit<IModule<ModuleType>, "id" | "voiceNo">;

export type ModuleProps = IAnyModuleSerialize;

export const AvailableModules: Record<
  ModuleType,
  Optional<ModuleInterface, "props">
> = {
  [ModuleType.Master]: { name: "Master", moduleType: ModuleType.Master },
  [ModuleType.Oscillator]: {
    name: "Oscillator",
    moduleType: ModuleType.Oscillator,
    props: { lowGain: true },
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
  [ModuleType.StereoPanner]: {
    name: "Stereo Panner",
    moduleType: ModuleType.StereoPanner,
  },
  [ModuleType.MidiMapper]: {
    name: "Midi Mapper",
    moduleType: ModuleType.MidiMapper,
  },
  [ModuleType.VirtualMidi]: {
    name: "Keyboard",
    moduleType: ModuleType.VirtualMidi,
  },
  [ModuleType.StepSequencer]: {
    name: "StepSequencer",
    moduleType: ModuleType.StepSequencer,
  },
  [ModuleType.VoiceScheduler]: {
    name: "VoiceScheduler",
    moduleType: ModuleType.VoiceScheduler,
  },
  [ModuleType.LFO]: { name: "LFO", moduleType: ModuleType.LFO },
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
    const { props: defaultProps = {} } =
      AvailableModules[audioModule.moduleType];
    const serializedModule = Engine.current.addModule({
      ...audioModule,
      props: { ...defaultProps, ...audioModule.props },
    });

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
    const { props = {}, ...moduleAttrs } = AvailableModules[type];
    dispatch(
      addModule({
        audioModule: { ...moduleAttrs, props },
        position,
      }),
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

export const selectAllExceptSelf = createSelector(
  (state: RootState) => modulesSelector.selectAll(state),
  (_: RootState, id: string) => id,
  (modules: ModuleProps[], id: string) => modules.filter((m) => m.id !== id),
);

export default modulesSlice.reducer;
