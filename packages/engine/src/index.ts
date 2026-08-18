export { Engine } from "./Engine";
export type {
  EngineStateUpdate,
  EngineStateUpdateCallback,
  ICreateRoute,
  IUpdateModule,
  IEngineSerialize,
} from "./Engine";

export type {
  IRoute,
  IIOSerialize,
  IModule,
  IModuleSerialize,
  IPolyModuleSerialize,
  IAnyModuleSerialize,
  IMidiDevice,
  ModulePropSchema,
  PropSchema,
  StringProp,
  NumberProp,
  EnumProp,
  BooleanProp,
  ArrayProp,
  INote,
  SetterHooks,
  StateSetterHooks,
  ControllerMatcherDefinition,
  MatchedControllerPorts,
} from "./core";
export {
  MidiDevice,
  MidiInputDevice,
  MidiOutputDevice,
  ControllerMatcherRegistry,
  controllerMatchers,
  LaunchControlXL3,
  MidiPortState,
  Note,
  MidiEvent,
  MidiEventType,
} from "./core";

export { TransportState } from "@blibliki/transport";
export type { BPM, TimeSignature, Position } from "@blibliki/transport";

// The MIDI seam: platform entries wire an adapter, apps on platforms without
// Web MIDI (Capacitor/iOS) replace it before creating an engine.
export { setMidiAdapterFactory } from "./core/midi/adapters";
export type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
  IMidiMessageEvent,
  IMidiOutputPort,
  IMidiPort,
  MidiMessageCallback,
} from "./core/midi/adapters";

export { Context } from "@blibliki/utils";
export {
  encodeWavPcm16,
  exportWavetableScanToWavBytes,
  extractEmbeddedWavetableTablesFromWavBytes,
  extractWavetableTablesFromAudioBuffer,
  extractWavetableTablesFromSamples,
  renderWavetableFrameSequenceSamples,
  renderWavetableScanSamples,
} from "./utils";
export type {
  ExtractWavetableOptions,
  RenderWavetableScanOptions,
  WavetableTable,
} from "./utils";

export {
  ModuleType,
  moduleSchemas,
  OscillatorWave,
  MidiMappingMode,
  LFOWaveform,
  Resolution,
  PlaybackMode,
  stepPropSchema,
  NoiseType,
  DelayTimeMode,
  ReverbType,
  cloneWavetablePresetTables,
  CUSTOM_WAVETABLE_PRESET_ID,
  DEFAULT_WAVETABLE_PRESET_ID,
  parseWavetableDefinition,
  formatWavetableDefinition,
  parseWavetableConfig,
  formatWavetableConfig,
  getWavetablePresetById,
  getWavetablePresetIdByTables,
  WAVETABLE_PRESETS,
} from "./modules";
export { default as StepSequencer } from "./modules/StepSequencer";
export type {
  IOscillator,
  IGain,
  IVolume,
  IVolumeProps,
  IMaster,
  IStepSequencerProps,
  IStepSequencerState,
  IStepSequencer,
  IStep,
  IPage,
  IPattern,
  IStepNote,
  IStepCC,
  ModuleTypeToPropsMapping,
  ModuleTypeToStateMapping,
  ICreateModule,
  ModuleParams,
  IMidiMapper,
  IMidiMapperProps,
  MidiMapping,
  ILFO,
  ILFOProps,
  INoise,
  ICompressor,
  ICompressorProps,
  IWavetable,
  IWavetableConfig,
  IWavetableDefinition,
  IWavetablePreset,
  IWavetableProps,
  IWavetableState,
  IWavetableTable,
  IDrumMachine,
  IDrumMachineProps,
  IAudioRecorder,
  IAudioRecorderProps,
  IAudioRecorderState,
} from "./modules";
