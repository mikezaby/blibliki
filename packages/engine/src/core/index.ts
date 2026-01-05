export { Module } from "./module";
export type {
  IModule,
  IModuleSerialize,
  IPolyModuleSerialize,
  IAnyModuleSerialize,
  SetterHooks,
} from "./module";

export type IAnyAudioContext = AudioContext | OfflineAudioContext;

export { Routes } from "./Route";
export type { IRoute } from "./Route";

export { default as MidiDeviceManager } from "./midi/MidiDeviceManager";
export {
  default as BaseMidiDevice,
  MidiPortState,
} from "./midi/BaseMidiDevice";
export type { IMidiDevice } from "./midi/BaseMidiDevice";
export { default as MidiInputDevice } from "./midi/MidiInputDevice";
export type { IMidiInput, EventListerCallback } from "./midi/MidiInputDevice";
export { default as MidiOutputDevice } from "./midi/MidiOutputDevice";
// Legacy export for backwards compatibility
export { default as MidiDevice } from "./midi/MidiInputDevice";
export { default as MidiEvent, MidiEventType } from "./midi/MidiEvent";
export {
  normalizeDeviceName,
  extractCoreTokens,
  calculateSimilarity,
  findBestMatch,
} from "./midi/deviceMatcher";

export type {
  MidiOutput,
  MidiInput,
  AudioInput,
  AudioOutput,
  IIOSerialize,
} from "./IO";

export type {
  ModulePropSchema,
  PropSchema,
  NumberProp,
  StringProp,
  EnumProp,
  BooleanProp,
  ArrayProp,
} from "./schema";

export { default as Note } from "./Note";
export type { INote } from "./Note";
