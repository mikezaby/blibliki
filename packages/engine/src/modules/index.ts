import { assertNever } from "@blibliki/utils";
import { IModule, Module } from "@/core";
import { IPolyModuleConstructor } from "@/core/module/PolyModule";
import VoiceScheduler, {
  IVoiceSchedulerProps,
  voiceSchedulerPropSchema,
} from "@/core/module/VoiceScheduler";
import Chorus, { chorusPropSchema, IChorusProps } from "./Chorus";
import Constant, { constantPropSchema, IConstantProps } from "./Constant";
import Delay, { delayPropSchema, IDelayProps } from "./Delay";
import Distortion, {
  distortionPropSchema,
  IDistortionProps,
} from "./Distortion";
import Envelope, { envelopePropSchema, IEnvelopeProps } from "./Envelope";
import Filter, { filterPropSchema, IFilterProps } from "./Filter";
import Gain, { gainPropSchema, IGainProps } from "./Gain";
import Inspector, { IInspectorProps, inspectorPropSchema } from "./Inspector";
import LFO, { ILFOProps, lfoPropSchema } from "./LFO";
import Master, { IMasterProps, masterPropSchema } from "./Master";
import MidiInput, { IMidiInputProps, midiInputPropSchema } from "./MidiInput";
import MidiMapper, {
  IMidiMapperProps,
  midiMapperPropSchema,
} from "./MidiMapper";
import MidiSelector, {
  IMidiSelectorProps,
  midiSelectorPropSchema,
} from "./MidiSelector";
import Noise, { INoiseProps, noisePropSchema } from "./Noise";
import Oscillator, {
  IOscillatorProps,
  oscillatorPropSchema,
} from "./Oscillator";
import Reverb, { IReverbProps, reverbPropSchema } from "./Reverb";
import Scale, { IScaleProps, scalePropSchema } from "./Scale";
import StepSequencer, {
  IStepSequencerProps,
  stepSequencerPropSchema,
} from "./StepSequencer";
import StereoPanner, {
  IStereoPannerProps,
  stereoPannerPropSchema,
} from "./StereoPanner";
import VirtualMidi, {
  IVirtualMidiProps,
  virtualMidiPropSchema,
} from "./VirtualMidi";

export enum ModuleType {
  Master = "Master",
  Oscillator = "Oscillator",
  Gain = "Gain",
  MidiInput = "MidiInput",
  MidiSelector = "MidiSelector", // BACKWARD_COMPAT_MIDI_SELECTOR: Remove after migration
  Envelope = "Envelope",
  Filter = "Filter",
  Scale = "Scale",
  StereoPanner = "StereoPanner",
  Inspector = "Inspector",
  Chorus = "Chorus",
  Constant = "Constant",
  Delay = "Delay",
  Distortion = "Distortion",
  MidiMapper = "MidiMapper",
  VirtualMidi = "VirtualMidi",
  StepSequencer = "StepSequencer",
  VoiceScheduler = "VoiceScheduler",
  LFO = "LFO",
  Noise = "Noise",
  Reverb = "Reverb",
}

export type ModuleTypeToPropsMapping = {
  [ModuleType.Oscillator]: IOscillatorProps;
  [ModuleType.Gain]: IGainProps;
  [ModuleType.Master]: IMasterProps;
  [ModuleType.MidiInput]: IMidiInputProps;
  [ModuleType.MidiSelector]: IMidiSelectorProps; // BACKWARD_COMPAT_MIDI_SELECTOR: Remove after migration
  [ModuleType.Envelope]: IEnvelopeProps;
  [ModuleType.Filter]: IFilterProps;
  [ModuleType.Scale]: IScaleProps;
  [ModuleType.StereoPanner]: IStereoPannerProps;
  [ModuleType.Inspector]: IInspectorProps;
  [ModuleType.Chorus]: IChorusProps;
  [ModuleType.Constant]: IConstantProps;
  [ModuleType.Delay]: IDelayProps;
  [ModuleType.Distortion]: IDistortionProps;
  [ModuleType.MidiMapper]: IMidiMapperProps;
  [ModuleType.VirtualMidi]: IVirtualMidiProps;
  [ModuleType.StepSequencer]: IStepSequencerProps;
  [ModuleType.VoiceScheduler]: IVoiceSchedulerProps;
  [ModuleType.LFO]: ILFOProps;
  [ModuleType.Noise]: INoiseProps;
  [ModuleType.Reverb]: IReverbProps;
};

export type ModuleTypeToModuleMapping = {
  [ModuleType.Oscillator]: Oscillator;
  [ModuleType.Gain]: Gain;
  [ModuleType.Master]: Master;
  [ModuleType.MidiInput]: MidiInput;
  [ModuleType.MidiSelector]: MidiSelector; // BACKWARD_COMPAT_MIDI_SELECTOR: Remove after migration
  [ModuleType.Envelope]: Envelope;
  [ModuleType.Filter]: Filter;
  [ModuleType.Scale]: Scale;
  [ModuleType.StereoPanner]: StereoPanner;
  [ModuleType.Inspector]: Inspector;
  [ModuleType.Chorus]: Chorus;
  [ModuleType.Constant]: Constant;
  [ModuleType.Delay]: Delay;
  [ModuleType.Distortion]: Distortion;
  [ModuleType.MidiMapper]: MidiMapper;
  [ModuleType.VirtualMidi]: VirtualMidi;
  [ModuleType.StepSequencer]: StepSequencer;
  [ModuleType.VoiceScheduler]: VoiceScheduler;
  [ModuleType.LFO]: LFO;
  [ModuleType.Noise]: Noise;
  [ModuleType.Reverb]: Reverb;
};

export const moduleSchemas = {
  [ModuleType.Oscillator]: oscillatorPropSchema,
  [ModuleType.Gain]: gainPropSchema,
  [ModuleType.Master]: masterPropSchema,
  [ModuleType.MidiInput]: midiInputPropSchema,
  [ModuleType.MidiSelector]: midiSelectorPropSchema, // BACKWARD_COMPAT_MIDI_SELECTOR: Remove after migration
  [ModuleType.Envelope]: envelopePropSchema,
  [ModuleType.Filter]: filterPropSchema,
  [ModuleType.Scale]: scalePropSchema,
  [ModuleType.StereoPanner]: stereoPannerPropSchema,
  [ModuleType.Inspector]: inspectorPropSchema,
  [ModuleType.Chorus]: chorusPropSchema,
  [ModuleType.Constant]: constantPropSchema,
  [ModuleType.Delay]: delayPropSchema,
  [ModuleType.Distortion]: distortionPropSchema,
  [ModuleType.MidiMapper]: midiMapperPropSchema,
  [ModuleType.VirtualMidi]: virtualMidiPropSchema,
  [ModuleType.StepSequencer]: stepSequencerPropSchema,
  [ModuleType.VoiceScheduler]: voiceSchedulerPropSchema,
  [ModuleType.LFO]: lfoPropSchema,
  [ModuleType.Noise]: noisePropSchema,
  [ModuleType.Reverb]: reverbPropSchema,
};

export type { IOscillator } from "./Oscillator";
export { OscillatorWave } from "./Oscillator";
export type { IGain } from "./Gain";
export type { IMaster } from "./Master";
export type { IMidiInput, IMidiInputProps } from "./MidiInput";
export type { IMidiSelector } from "./MidiSelector"; // BACKWARD_COMPAT_MIDI_SELECTOR: Remove after migration
export type { IStereoPanner } from "./StereoPanner";
export type {
  IStepSequencer,
  IStepSequencerProps,
  IStep,
  IPage,
  IPattern,
  IStepNote,
  IStepCC,
} from "./StepSequencer";
export { Resolution, PlaybackMode, stepPropSchema } from "./StepSequencer";
export type { IMidiMapper, IMidiMapperProps, MidiMapping } from "./MidiMapper";
export { MidiMappingMode } from "./MidiMapper";
export type { ILFO, ILFOProps } from "./LFO";
export { LFOWaveform } from "./LFO";
export type { INoise } from "./Noise";
export { NoiseType } from "./Noise";
export type { IReverb, IReverbProps } from "./Reverb";
export { ReverbType } from "./Reverb";
export { DelayTimeMode } from "./Delay";
export type { IDelay, IDelayProps } from "./Delay";
export type { IDistortion, IDistortionProps } from "./Distortion";
export type { IChorus, IChorusProps } from "./Chorus";

export type AnyModule = Module<ModuleType>;
export type IAnyModule = IModule<ModuleType>;

export type ICreateModule<T extends ModuleType> = {
  id?: string;
  name: string;
  moduleType: T;
  props: Partial<ModuleTypeToPropsMapping[T]>;
};

export type ModuleParams = {
  [K in ModuleType]: K extends
    | ModuleType.Oscillator
    | ModuleType.Gain
    | ModuleType.Envelope
    | ModuleType.Filter
    | ModuleType.StereoPanner
    | ModuleType.VoiceScheduler
    | ModuleType.Scale
    | ModuleType.LFO
    | ModuleType.Distortion
    ? IPolyModuleConstructor<K>
    : ICreateModule<K>;
}[ModuleType];

export function createModule(
  engineId: string,
  params: ModuleParams,
): ModuleTypeToModuleMapping[keyof ModuleTypeToModuleMapping] {
  switch (params.moduleType) {
    case ModuleType.Oscillator:
      return new Oscillator(engineId, params);
    case ModuleType.Gain:
      return new Gain(engineId, params);
    case ModuleType.Master:
      return new Master(engineId, params);
    case ModuleType.MidiInput:
      return new MidiInput(engineId, params);
    // BACKWARD_COMPAT_MIDI_SELECTOR: Remove after migration
    case ModuleType.MidiSelector:
      // Convert old MidiSelector to MidiInput
      return new MidiInput(engineId, {
        ...params,
        moduleType: ModuleType.MidiInput,
      } as ICreateModule<ModuleType.MidiInput>);
    case ModuleType.Envelope:
      return new Envelope(engineId, params);
    case ModuleType.Filter:
      return new Filter(engineId, params);
    case ModuleType.Scale:
      return new Scale(engineId, params);
    case ModuleType.StereoPanner:
      return new StereoPanner(engineId, params);
    case ModuleType.Inspector:
      return new Inspector(engineId, params);
    case ModuleType.Chorus:
      return new Chorus(engineId, params);
    case ModuleType.Constant:
      return new Constant(engineId, params);
    case ModuleType.Delay:
      return new Delay(engineId, params);
    case ModuleType.Distortion:
      return new Distortion(engineId, params);
    case ModuleType.MidiMapper:
      return new MidiMapper(engineId, params);
    case ModuleType.VirtualMidi:
      return new VirtualMidi(engineId, params);
    case ModuleType.StepSequencer:
      return new StepSequencer(engineId, params);
    case ModuleType.VoiceScheduler:
      return new VoiceScheduler(engineId, params);
    case ModuleType.LFO:
      return new LFO(engineId, params);
    case ModuleType.Noise:
      return new Noise(engineId, params);
    case ModuleType.Reverb:
      return new Reverb(engineId, params);
    default:
      assertNever(params);
  }
}
