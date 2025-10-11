import { ModuleType, ModuleTypeToPropsMapping } from "@blibliki/engine";
import { JSX } from "react";
import { useAppDispatch } from "@/hooks";
import Constant from "./Constant";
import Envelope from "./Envelope";
import { Filter, BiquadFilter } from "./Filter";
import Gain from "./Gain";
import Inspector from "./Inspector";
import Keyboard from "./Keyboard";
import Master from "./Master";
import MidiDeviceSelector from "./MidiDeviceSelector";
import Oscillator from "./Oscillator";
import Scale from "./Scale";
import VoiceScheduler from "./VoiceScheduler";
import { updateModule } from "./modulesSlice";

export interface AudioModuleProps<T extends ModuleType> {
  id: string;
  name: string;
  moduleType: T;
  props: ModuleTypeToPropsMapping[T];
}

export type ModuleComponent<T extends ModuleType> = (
  props: AudioModuleProps<T> & {
    updateProp: TUpdateProp<T>;
  },
) => JSX.Element;

export type TUpdateProp<T extends ModuleType> = <
  K extends keyof ModuleTypeToPropsMapping[T],
>(
  propName: K,
) => (value: ModuleTypeToPropsMapping[T][K]) => void;

type TUpdateProps<T extends ModuleType> = (
  props: Partial<ModuleTypeToPropsMapping[T]>,
) => void;

const COMPONENT_MAPPING: {
  [K in ModuleType]?: ModuleComponent<K>;
} = {
  [ModuleType.Oscillator]: Oscillator,
  [ModuleType.Master]: Master,
  [ModuleType.Filter]: Filter,
  [ModuleType.BiquadFilter]: BiquadFilter,
  [ModuleType.Gain]: Gain,
  [ModuleType.Envelope]: Envelope,
  [ModuleType.MidiSelector]: MidiDeviceSelector,
  [ModuleType.VirtualMidi]: Keyboard,
  [ModuleType.Constant]: Constant,
  [ModuleType.Scale]: Scale,
  [ModuleType.Inspector]: Inspector,
  [ModuleType.StepSequencer]: undefined,
  [ModuleType.VoiceScheduler]: VoiceScheduler,
};

export default function AudioModule<T extends ModuleType>(audioModuleProps: {
  audioModule: AudioModuleProps<T>;
}) {
  const dispatch = useAppDispatch();

  const { id, name, moduleType, props } = audioModuleProps.audioModule;

  const Component = COMPONENT_MAPPING[moduleType] as ModuleComponent<T>;

  const updateProps: TUpdateProps<T> = (props) => {
    dispatch(updateModule({ id, moduleType, changes: { props } }));
  };

  const updateProp =
    <K extends keyof ModuleTypeToPropsMapping[T]>(propName: K) =>
    (value: ModuleTypeToPropsMapping[T][K]) => {
      const patch = {
        [propName]: value,
      } as { [P in K]: ModuleTypeToPropsMapping[T][P] } as Partial<
        ModuleTypeToPropsMapping[T]
      >;

      updateProps(patch);
    };

  return (
    <Component
      id={id}
      moduleType={moduleType}
      name={name}
      props={props}
      updateProp={updateProp}
    />
  );
}
