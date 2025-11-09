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
import CustomEnvelope, {
  customEnvelopePropSchema,
  ICustomEnvelopeProps,
} from "./Envelope";
import Filter, { filterPropSchema, IFilterProps } from "./Filter";
import Gain, { gainPropSchema, IGainProps } from "./Gain";
import Inspector, { IInspectorProps, inspectorPropSchema } from "./Inspector";
import LFO, { ILFOProps, lfoPropSchema } from "./LFO";
import LegacyEnvelope, {
  envelopePropSchema as legacyEnvelopePropSchema,
  IEnvelopeProps as ILegacyEnvelopeProps,
} from "./LegacyEnvelope";
import Master, { IMasterProps, masterPropSchema } from "./Master";
import MidiInput, { IMidiInputProps, midiInputPropSchema } from "./MidiInput";
import MidiMapper, {
  IMidiMapperProps,
  midiMapperPropSchema,
} from "./MidiMapper";
import MidiOutput, {
  IMidiOutputProps,
  midiOutputPropSchema,
} from "./MidiOutput";
import Noise, { INoiseProps, noisePropSchema } from "./Noise";
import Oscillator, {
  IOscillatorProps,
  oscillatorPropSchema,
} from "./Oscillator";
import Reverb, { IReverbProps, reverbPropSchema } from "./Reverb";
import Scale, { IScaleProps, scalePropSchema } from "./Scale";
import StepSequencer, {
  IStepSequencerProps,
  IStepSequencerState,
  stepSequencerPropSchema,
} from "./StepSequencer";
import StereoPanner, {
  IStereoPannerProps,
  stereoPannerPropSchema,
} from "./StereoPanner";
import Stretch, { IStretchProps, stretchPropSchema } from "./Stretch";
import VirtualMidi, {
  IVirtualMidiProps,
  virtualMidiPropSchema,
} from "./VirtualMidi";
import Wavetable, {
  IWavetableProps,
  IWavetableState,
  wavetablePropSchema,
} from "./Wavetable";

export enum ModuleType {
  Master = "Master",
  Oscillator = "Oscillator",
  Wavetable = "Wavetable",
  Gain = "Gain",
  MidiInput = "MidiInput",
  MidiOutput = "MidiOutput",
  LegacyEnvelope = "LegacyEnvelope", // BACKWARD_COMPAT: Legacy envelope for old patches
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
  Stretch = "Stretch",
  VoiceScheduler = "VoiceScheduler",
  LFO = "LFO",
  Noise = "Noise",
  Reverb = "Reverb",
}

export type ModuleTypeToPropsMapping = {
  [ModuleType.Oscillator]: IOscillatorProps;
  [ModuleType.Wavetable]: IWavetableProps;
  [ModuleType.Gain]: IGainProps;
  [ModuleType.Master]: IMasterProps;
  [ModuleType.MidiInput]: IMidiInputProps;
  [ModuleType.MidiOutput]: IMidiOutputProps;
  [ModuleType.LegacyEnvelope]: ILegacyEnvelopeProps; // BACKWARD_COMPAT: Legacy envelope for old patches
  [ModuleType.Envelope]: ICustomEnvelopeProps;
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
  [ModuleType.Stretch]: IStretchProps;
  [ModuleType.VoiceScheduler]: IVoiceSchedulerProps;
  [ModuleType.LFO]: ILFOProps;
  [ModuleType.Noise]: INoiseProps;
  [ModuleType.Reverb]: IReverbProps;
};

export type ModuleTypeToStateMapping = {
  [ModuleType.Oscillator]: never;
  [ModuleType.Wavetable]: IWavetableState;
  [ModuleType.Gain]: never;
  [ModuleType.Master]: never;
  [ModuleType.MidiInput]: never;
  [ModuleType.MidiOutput]: never;
  [ModuleType.LegacyEnvelope]: never;
  [ModuleType.Envelope]: never;
  [ModuleType.Filter]: never;
  [ModuleType.Scale]: never;
  [ModuleType.StereoPanner]: never;
  [ModuleType.Inspector]: never;
  [ModuleType.Chorus]: never;
  [ModuleType.Constant]: never;
  [ModuleType.Delay]: never;
  [ModuleType.Distortion]: never;
  [ModuleType.MidiMapper]: never;
  [ModuleType.VirtualMidi]: never;
  [ModuleType.StepSequencer]: IStepSequencerState;
  [ModuleType.VoiceScheduler]: never;
  [ModuleType.LFO]: never;
  [ModuleType.Noise]: never;
  [ModuleType.Reverb]: never;
};

export type ModuleTypeToModuleMapping = {
  [ModuleType.Oscillator]: Oscillator;
  [ModuleType.Wavetable]: Wavetable;
  [ModuleType.Gain]: Gain;
  [ModuleType.Master]: Master;
  [ModuleType.MidiInput]: MidiInput;
  [ModuleType.MidiOutput]: MidiOutput;
  [ModuleType.LegacyEnvelope]: LegacyEnvelope; // BACKWARD_COMPAT: Legacy envelope for old patches
  [ModuleType.Envelope]: CustomEnvelope;
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
  [ModuleType.Stretch]: Stretch;
  [ModuleType.VoiceScheduler]: VoiceScheduler;
  [ModuleType.LFO]: LFO;
  [ModuleType.Noise]: Noise;
  [ModuleType.Reverb]: Reverb;
};

export const moduleSchemas = {
  [ModuleType.Oscillator]: oscillatorPropSchema,
  [ModuleType.Wavetable]: wavetablePropSchema,
  [ModuleType.Gain]: gainPropSchema,
  [ModuleType.Master]: masterPropSchema,
  [ModuleType.MidiInput]: midiInputPropSchema,
  [ModuleType.MidiOutput]: midiOutputPropSchema,
  [ModuleType.LegacyEnvelope]: legacyEnvelopePropSchema, // BACKWARD_COMPAT: Legacy envelope for old patches
  [ModuleType.Envelope]: customEnvelopePropSchema,
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
  [ModuleType.Stretch]: stretchPropSchema,
  [ModuleType.VoiceScheduler]: voiceSchedulerPropSchema,
  [ModuleType.LFO]: lfoPropSchema,
  [ModuleType.Noise]: noisePropSchema,
  [ModuleType.Reverb]: reverbPropSchema,
};

export type { IOscillator } from "./Oscillator";
export { OscillatorWave } from "./Oscillator";
export type {
  IWavetable,
  IWavetableProps,
  IWavetableState,
  IWavetableConfig,
  IWavetableDefinition,
} from "./Wavetable";
export {
  formatWavetableConfig,
  parseWavetableDefinition,
  parseWavetableConfig,
  formatWavetableDefinition,
} from "./Wavetable";
export type { IGain } from "./Gain";
export type { IMaster } from "./Master";
export type { IMidiInput, IMidiInputProps } from "./MidiInput";
export type { IMidiOutput, IMidiOutputProps } from "./MidiOutput";
export type { IStereoPanner } from "./StereoPanner";
export type { IStretch } from "./Stretch";
export type {
  IStepSequencer,
  IStepSequencerProps,
  IStepSequencerState,
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
    | ModuleType.Wavetable
    | ModuleType.Gain
    | ModuleType.LegacyEnvelope
    | ModuleType.Envelope
    | ModuleType.Filter
    | ModuleType.StereoPanner
    | ModuleType.Stretch
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
      return Oscillator.create(Oscillator, engineId, params);
    case ModuleType.Wavetable:
      return Wavetable.create(Wavetable, engineId, params);
    case ModuleType.Gain:
      return Gain.create(Gain, engineId, params);
    case ModuleType.Master:
      return Master.create(Master, engineId, params);
    case ModuleType.MidiInput:
      return MidiInput.create(MidiInput, engineId, params);
    case ModuleType.MidiOutput:
      return MidiOutput.create(MidiOutput, engineId, params);
    // BACKWARD_COMPAT: Legacy envelope for old patches
    case ModuleType.LegacyEnvelope:
      return LegacyEnvelope.create(LegacyEnvelope, engineId, params);
    case ModuleType.Envelope:
      return CustomEnvelope.create(CustomEnvelope, engineId, params);
    case ModuleType.Filter:
      return Filter.create(Filter, engineId, params);
    case ModuleType.Scale:
      return Scale.create(Scale, engineId, params);
    case ModuleType.StereoPanner:
      return StereoPanner.create(StereoPanner, engineId, params);
    case ModuleType.Inspector:
      return Inspector.create(Inspector, engineId, params);
    case ModuleType.Chorus:
      return Chorus.create(Chorus, engineId, params);
    case ModuleType.Constant:
      return Constant.create(Constant, engineId, params);
    case ModuleType.Delay:
      return Delay.create(Delay, engineId, params);
    case ModuleType.Distortion:
      return Distortion.create(Distortion, engineId, params);
    case ModuleType.MidiMapper:
      return MidiMapper.create(MidiMapper, engineId, params);
    case ModuleType.VirtualMidi:
      return VirtualMidi.create(VirtualMidi, engineId, params);
    case ModuleType.StepSequencer:
      return StepSequencer.create(StepSequencer, engineId, params);
    case ModuleType.Stretch:
      return Stretch.create(Stretch, engineId, params);
    case ModuleType.VoiceScheduler:
      return VoiceScheduler.create(VoiceScheduler, engineId, params);
    case ModuleType.LFO:
      return LFO.create(LFO, engineId, params);
    case ModuleType.Noise:
      return Noise.create(Noise, engineId, params);
    case ModuleType.Reverb:
      return Reverb.create(Reverb, engineId, params);
    default:
      assertNever(params);
  }
}
