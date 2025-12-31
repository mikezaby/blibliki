import { ModuleType, ModuleTypeToPropsMapping } from "@blibliki/engine";
import { ReactNode } from "react";
import { useAppDispatch } from "@/hooks";
import Chorus from "./Chorus";
import Constant from "./Constant";
import Delay from "./Delay";
import Distortion from "./Distortion";
import Envelope from "./Envelope";
import { Filter } from "./Filter";
import Gain from "./Gain";
import Inspector from "./Inspector";
import Keyboard from "./Keyboard";
import LFO from "./LFO";
import Master from "./Master";
import MidiDeviceSelector from "./MidiDeviceSelector";
import MidiMapper from "./MidiMapper";
import Noise from "./Noise";
import Oscillator from "./Oscillator";
import Reverb from "./Reverb";
import Scale from "./Scale";
import StepSequencer from "./StepSequencer";
import StereoPanner from "./StereoPanner";
import VoiceScheduler from "./VoiceScheduler";
import { updateModule } from "./modulesSlice";

export type AudioModuleProps<T extends ModuleType> = {
  id: string;
  name: string;
  moduleType: T;
  props: ModuleTypeToPropsMapping[T];
};

export type ModuleComponent<T extends ModuleType> = (
  props: AudioModuleProps<T> & {
    updateProp: TUpdateProp<T>;
  },
) => ReactNode;

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
  [ModuleType.Gain]: Gain,
  [ModuleType.Envelope]: Envelope,
  [ModuleType.MidiSelector]: MidiDeviceSelector,
  [ModuleType.MidiMapper]: MidiMapper,
  [ModuleType.VirtualMidi]: Keyboard,
  [ModuleType.Chorus]: Chorus,
  [ModuleType.Constant]: Constant,
  [ModuleType.Delay]: Delay,
  [ModuleType.Distortion]: Distortion,
  [ModuleType.Scale]: Scale,
  [ModuleType.Inspector]: Inspector,
  [ModuleType.StereoPanner]: StereoPanner,
  [ModuleType.StepSequencer]: StepSequencer,
  [ModuleType.VoiceScheduler]: VoiceScheduler,
  [ModuleType.LFO]: LFO,
  [ModuleType.Noise]: Noise,
  [ModuleType.Reverb]: Reverb,
};

export default function AudioModule<T extends ModuleType>(audioModuleProps: {
  audioModule: AudioModuleProps<T>;
}) {
  const dispatch = useAppDispatch();

  const { id, name, moduleType, props } = audioModuleProps.audioModule;

  // Direct component lookup from static mapping to avoid "creating components during render" error
  const ComponentFromMapping = COMPONENT_MAPPING[moduleType];

  if (!ComponentFromMapping) {
    throw new Error(`No component found for module type: ${moduleType}`);
  }

  // Type assertion needed for TypeScript to understand the generic relationship
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const Component = ComponentFromMapping as ModuleComponent<T>;

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
