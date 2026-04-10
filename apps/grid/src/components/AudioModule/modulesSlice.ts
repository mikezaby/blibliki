import {
  Engine,
  IAnyModuleSerialize,
  IModule,
  IUpdateModule,
  ModuleType,
  ModuleTypeToStateMapping,
} from "@blibliki/engine";
import { Optional } from "@blibliki/utils";
import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { XYPosition } from "@xyflow/react";
import { addNode } from "@/components/Grid/gridNodesSlice";
import { AppDispatch, RootState } from "@/store";
import {
  addModuleProps,
  removeAllModuleProps,
  removeModuleProps,
  type ModulePropsEntity,
  updateModuleProps,
} from "./modulePropsSlice";
import {
  addModuleState,
  removeAllModuleState,
  removeModuleState,
  type ModuleStateEntity,
  updateModuleState,
} from "./moduleStateSlice";

export type AvailableModuleType = Exclude<
  ModuleType,
  ModuleType.LegacyEnvelope
>;

type ModuleInterface = {
  voices?: number;
} & Omit<IModule<AvailableModuleType>, "id" | "voiceNo">;

type ModuleSerialized = IAnyModuleSerialize<AvailableModuleType> & {
  state?: ModuleTypeToStateMapping[AvailableModuleType];
};

// Runtime module type that includes optional state
export type ModuleProps = ModuleSerialized;
export type ModuleSerializedProps = ModuleSerialized["props"];
export type ModuleSerializedState =
  ModuleTypeToStateMapping[AvailableModuleType];
export type ModuleInfo = Omit<ModuleSerialized, "props" | "state">;

export const AvailableModules: Record<
  AvailableModuleType,
  Optional<ModuleInterface, "props">
> = {
  [ModuleType.Master]: { name: "Master", moduleType: ModuleType.Master },
  [ModuleType.Oscillator]: {
    name: "Oscillator",
    moduleType: ModuleType.Oscillator,
    props: { lowGain: true },
  },
  [ModuleType.Wavetable]: {
    name: "Wavetable",
    moduleType: ModuleType.Wavetable,
    props: {
      lowGain: true,
      tables: [
        {
          real: [0, 0],
          imag: [0, 0],
        },
        {
          real: [0, 0],
          imag: [0, 1],
        },
      ],
      position: 0,
      disableNormalization: false,
    },
  },
  [ModuleType.Envelope]: {
    name: "Envelope",
    moduleType: ModuleType.Envelope,
  },
  [ModuleType.Filter]: { name: "Filter", moduleType: ModuleType.Filter },
  [ModuleType.Gain]: { name: "Gain", moduleType: ModuleType.Gain },
  [ModuleType.MidiInput]: {
    name: "MIDI Input",
    moduleType: ModuleType.MidiInput,
  },
  [ModuleType.MidiChannelFilter]: {
    name: "MIDI Channel Filter",
    moduleType: ModuleType.MidiChannelFilter,
  },
  [ModuleType.MidiOutput]: {
    name: "MIDI Output",
    moduleType: ModuleType.MidiOutput,
  },
  [ModuleType.Scale]: { name: "Scale", moduleType: ModuleType.Scale },
  [ModuleType.Inspector]: {
    name: "Inspector",
    moduleType: ModuleType.Inspector,
  },
  [ModuleType.Constant]: { name: "Constant", moduleType: ModuleType.Constant },
  [ModuleType.Chorus]: { name: "Chorus", moduleType: ModuleType.Chorus },
  [ModuleType.Delay]: { name: "Delay", moduleType: ModuleType.Delay },
  [ModuleType.Distortion]: {
    name: "Distortion",
    moduleType: ModuleType.Distortion,
  },
  [ModuleType.StereoPanner]: {
    name: "Stereo Panner",
    moduleType: ModuleType.StereoPanner,
  },
  [ModuleType.MidiMapper]: {
    name: "Midi Mapper",
    moduleType: ModuleType.MidiMapper,
  },
  [ModuleType.TransportControl]: {
    name: "Transport Control",
    moduleType: ModuleType.TransportControl,
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
  [ModuleType.Noise]: { name: "Noise", moduleType: ModuleType.Noise },
  [ModuleType.Reverb]: { name: "Reverb", moduleType: ModuleType.Reverb },
  [ModuleType.DrumMachine]: {
    name: "Drum Machine",
    moduleType: ModuleType.DrumMachine,
  },
};

const modulesAdapter = createEntityAdapter<ModuleInfo>({});

export const modulesSlice = createSlice({
  name: "modules",
  initialState: modulesAdapter.getInitialState(),
  reducers: {
    addModuleInfo: (state, action: PayloadAction<ModuleInfo>) =>
      modulesAdapter.addOne(state, action.payload),
    updateModuleInfo: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<ModuleInfo> }>,
    ) => modulesAdapter.updateOne(state, action.payload),
    removeModuleInfo: (state, action: PayloadAction<string>) =>
      modulesAdapter.removeOne(state, action.payload),
    removeAllModuleInfo: (state) => modulesAdapter.removeAll(state),
  },
});

const {
  addModuleInfo,
  updateModuleInfo,
  removeModuleInfo,
  removeAllModuleInfo,
} = modulesSlice.actions;

type ModuleInfoChanges = Partial<Omit<ModuleInfo, "id" | "moduleType">>;
type ModuleChanges = ModuleInfoChanges & {
  props?: ModuleSerializedProps | object;
  state?: ModuleSerializedState | object;
};
type PlainModuleUpdate = { id: string; changes: ModuleChanges };
type RequestedModuleChanges = IUpdateModule<ModuleType>["changes"];

const hasOwn = (target: object, key: string) =>
  Object.prototype.hasOwnProperty.call(target, key);

const splitSerializedModule = (
  serializedModule: ModuleProps,
): {
  moduleInfo: ModuleInfo;
  moduleProps: ModulePropsEntity;
  moduleState: ModuleStateEntity;
} => {
  const { props, state, ...moduleInfo } = serializedModule;
  return {
    moduleInfo,
    moduleProps: {
      id: serializedModule.id,
      props,
    },
    moduleState: {
      id: serializedModule.id,
      state,
    },
  };
};

const pickRequestedModuleChanges = (
  serializedModule: ModuleProps,
  requestedChanges: RequestedModuleChanges,
): ModuleChanges => {
  const filteredChanges: ModuleChanges = {};
  const serializedModuleRecord = serializedModule as Record<string, unknown>;
  const filteredChangesRecord = filteredChanges as Record<string, unknown>;

  (["name", "props", "voices"] as const).forEach((key) => {
    if (!hasOwn(requestedChanges as object, key)) return;
    if (!hasOwn(serializedModuleRecord, key)) return;
    filteredChangesRecord[key] = serializedModuleRecord[key];
  });

  return filteredChanges;
};

export const updatePlainModule =
  (update: PlainModuleUpdate) => (dispatch: AppDispatch) => {
    const { id, changes } = update;
    const { props, state, ...moduleInfoChanges } = changes;

    if (Object.keys(moduleInfoChanges).length > 0) {
      dispatch(
        updateModuleInfo({
          id,
          changes: moduleInfoChanges,
        }),
      );
    }

    if (props !== undefined) {
      dispatch(
        updateModuleProps({
          id,
          changes: { props: props as ModuleSerializedProps },
        }),
      );
    }

    if (hasOwn(changes, "state")) {
      dispatch(
        updateModuleState({
          id,
          changes: { state: state as ModuleSerializedState | undefined },
        }),
      );
    }
  };

export const updateModule =
  (update: IUpdateModule<ModuleType>) => (dispatch: AppDispatch) => {
    const serializedModule = Engine.current.updateModule(update) as ModuleProps;
    const changes = pickRequestedModuleChanges(
      serializedModule,
      update.changes,
    );

    if (Object.keys(changes).length === 0) return;

    dispatch(
      updatePlainModule({
        id: serializedModule.id,
        changes,
      }),
    );
  };

export const addModule =
  (params: { audioModule: ModuleInterface; position?: XYPosition }) =>
  (dispatch: AppDispatch) => {
    const { audioModule, position = { x: 0, y: 0 } } = params;
    const { props: defaultProps = {} } =
      AvailableModules[audioModule.moduleType];
    const serializedModule = Engine.current.addModule({
      ...audioModule,
      props: { ...defaultProps, ...audioModule.props },
    }) as ModuleProps;

    const { moduleInfo, moduleProps, moduleState } =
      splitSerializedModule(serializedModule);

    dispatch(addModuleInfo(moduleInfo));
    dispatch(addModuleProps(moduleProps));
    dispatch(addModuleState(moduleState));

    dispatch(
      addNode({
        id: serializedModule.id,
        type: "audioNode",
        position,
        data: {},
      }),
    );

    return serializedModule.id;
  };

export const addNewModule =
  (params: { type: AvailableModuleType; position?: XYPosition }) =>
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
    const moduleInfo = moduleInfoSelector.selectById(getState(), id);
    if (!moduleInfo) throw Error(`Audio module with id ${id} not exists`);

    Engine.current.removeModule(id);
    dispatch(removeModuleInfo(id));
    dispatch(removeModuleProps(id));
    dispatch(removeModuleState(id));
  };

export const removeAllModules = () => (dispatch: AppDispatch) => {
  dispatch(removeAllModuleInfo());
  dispatch(removeAllModuleProps());
  dispatch(removeAllModuleState());
};

export const moduleInfoSelector = modulesAdapter.getSelectors(
  (state: RootState) => state.modules,
);

export const modulesSelector = moduleInfoSelector;

export default modulesSlice.reducer;
