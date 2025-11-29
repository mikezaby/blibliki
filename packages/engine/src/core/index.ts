export { Module } from "./module";
export type {
  IModule,
  IModuleSerialize,
  IPolyModuleSerialize,
  SetterHooks,
} from "./module";

export type IAnyAudioContext = AudioContext | OfflineAudioContext;

export { Routes } from "./Route";
export type { IRoute } from "./Route";

export { default as MidiDeviceManager } from "./midi/MidiDeviceManager";
export { default as MidiDevice, MidiPortState } from "./midi/MidiDevice";
export type { IMidiDevice } from "./midi/MidiDevice";
export { default as MidiEvent, MidiEventType } from "./midi/MidiEvent";

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
