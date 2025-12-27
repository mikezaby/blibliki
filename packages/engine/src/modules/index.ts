import { assertNever } from "@blibliki/utils";
import { IModule, Module } from "@/core";
import { IPolyModuleConstructor } from "@/core/module/PolyModule";
import VoiceScheduler, {
  IVoiceSchedulerProps,
  voiceSchedulerPropSchema,
} from "@/core/module/VoiceScheduler";
import Constant, { constantPropSchema, IConstantProps } from "./Constant";
import Envelope, { envelopePropSchema, IEnvelopeProps } from "./Envelope";
import Filter, { filterPropSchema, IFilterProps } from "./Filter";
import Gain, { gainPropSchema, IGainProps } from "./Gain";
import Inspector, { IInspectorProps, inspectorPropSchema } from "./Inspector";
import LFO, { ILFOProps, lfoPropSchema } from "./LFO";
import Master, { IMasterProps, masterPropSchema } from "./Master";
import MidiMapper, {
  IMidiMapperProps,
  midiMapperPropSchema,
} from "./MidiMapper";
import MidiSelector, {
  IMidiSelectorProps,
  midiSelectorPropSchema,
} from "./MidiSelector";
import Oscillator, {
  IOscillatorProps,
  oscillatorPropSchema,
} from "./Oscillator";
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
  MidiSelector = "MidiSelector",
  Envelope = "Envelope",
  Filter = "Filter",
  Scale = "Scale",
  StereoPanner = "StereoPanner",
  Inspector = "Inspector",
  Constant = "Constant",
  MidiMapper = "MidiMapper",
  VirtualMidi = "VirtualMidi",
  StepSequencer = "StepSequencer",
  VoiceScheduler = "VoiceScheduler",
  LFO = "LFO",
}

export type ModuleTypeToPropsMapping = {
  [ModuleType.Oscillator]: IOscillatorProps;
  [ModuleType.Gain]: IGainProps;
  [ModuleType.Master]: IMasterProps;
  [ModuleType.MidiSelector]: IMidiSelectorProps;
  [ModuleType.Envelope]: IEnvelopeProps;
  [ModuleType.Filter]: IFilterProps;
  [ModuleType.Scale]: IScaleProps;
  [ModuleType.StereoPanner]: IStereoPannerProps;
  [ModuleType.Inspector]: IInspectorProps;
  [ModuleType.Constant]: IConstantProps;
  [ModuleType.MidiMapper]: IMidiMapperProps;
  [ModuleType.VirtualMidi]: IVirtualMidiProps;
  [ModuleType.StepSequencer]: IStepSequencerProps;
  [ModuleType.VoiceScheduler]: IVoiceSchedulerProps;
  [ModuleType.LFO]: ILFOProps;
};

export type ModuleTypeToModuleMapping = {
  [ModuleType.Oscillator]: Oscillator;
  [ModuleType.Gain]: Gain;
  [ModuleType.Master]: Master;
  [ModuleType.MidiSelector]: MidiSelector;
  [ModuleType.Envelope]: Envelope;
  [ModuleType.Filter]: Filter;
  [ModuleType.Scale]: Scale;
  [ModuleType.StereoPanner]: StereoPanner;
  [ModuleType.Inspector]: Inspector;
  [ModuleType.Constant]: Constant;
  [ModuleType.MidiMapper]: MidiMapper;
  [ModuleType.VirtualMidi]: VirtualMidi;
  [ModuleType.StepSequencer]: StepSequencer;
  [ModuleType.VoiceScheduler]: VoiceScheduler;
  [ModuleType.LFO]: LFO;
};

export const moduleSchemas = {
  [ModuleType.Oscillator]: oscillatorPropSchema,
  [ModuleType.Gain]: gainPropSchema,
  [ModuleType.Master]: masterPropSchema,
  [ModuleType.MidiSelector]: midiSelectorPropSchema,
  [ModuleType.Envelope]: envelopePropSchema,
  [ModuleType.Filter]: filterPropSchema,
  [ModuleType.Scale]: scalePropSchema,
  [ModuleType.StereoPanner]: stereoPannerPropSchema,
  [ModuleType.Inspector]: inspectorPropSchema,
  [ModuleType.Constant]: constantPropSchema,
  [ModuleType.MidiMapper]: midiMapperPropSchema,
  [ModuleType.VirtualMidi]: virtualMidiPropSchema,
  [ModuleType.StepSequencer]: stepSequencerPropSchema,
  [ModuleType.VoiceScheduler]: voiceSchedulerPropSchema,
  [ModuleType.LFO]: lfoPropSchema,
};

export type { IOscillator } from "./Oscillator";
export { OscillatorWave } from "./Oscillator";
export type { IGain } from "./Gain";
export type { IMaster } from "./Master";
export type { IMidiSelector } from "./MidiSelector";
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
export type { ILFO, ILFOProps, NoteDivision } from "./LFO";
export { LFOMode, LFOWaveform, NOTE_DIVISIONS } from "./LFO";

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
    case ModuleType.MidiSelector:
      return new MidiSelector(engineId, params);
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
    case ModuleType.Constant:
      return new Constant(engineId, params);
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
    default:
      assertNever(params);
  }
}
