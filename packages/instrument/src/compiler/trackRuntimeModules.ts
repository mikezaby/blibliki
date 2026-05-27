import type { SerializableRuntimeModule } from "./instrumentRuntimeModules";
import {
  createMasterModule,
  createMidiInputModule,
  createMidiMapperModule,
  createMidiOutputModule,
} from "./instrumentRuntimeModules";
import type { TrackMasterOptions } from "./trackRuntimeState";
import type {
  CompiledMidiMapperProps,
  CompiledTrack,
  CompiledTrackEnginePatch,
  CreateTrackEnginePatchOptions,
  MidiPortSelection,
} from "./types";

export function createTrackMidiMapperProps(
  compiledTrack: CompiledTrack,
  options: CreateTrackEnginePatchOptions,
): CompiledMidiMapperProps {
  return {
    tracks: compiledTrack.launchControlXL3.midiMapper.tracks,
    activeTrack:
      options.midiMapper?.activeTrack ??
      compiledTrack.launchControlXL3.midiMapper.activeTrack,
    globalMappings:
      options.midiMapper?.globalMappings ??
      compiledTrack.launchControlXL3.midiMapper.globalMappings,
  };
}

export function createTrackRuntimeModules(options: {
  runtime: CompiledTrackEnginePatch["runtime"];
  compiledTrack: CompiledTrack;
  createOptions: CreateTrackEnginePatchOptions;
  masterOptions: TrackMasterOptions;
  noteInputSelection: MidiPortSelection | false;
  controllerInputSelection: MidiPortSelection | false;
  controllerOutputSelection: MidiPortSelection | false;
  externalMidiModules?: readonly SerializableRuntimeModule[];
}): SerializableRuntimeModule[] {
  const {
    runtime,
    compiledTrack,
    createOptions,
    masterOptions,
    noteInputSelection,
    controllerInputSelection,
    controllerOutputSelection,
    externalMidiModules = [],
  } = options;

  return [
    ...(noteInputSelection === false || !runtime.noteInputId
      ? []
      : [
          createMidiInputModule(
            runtime.noteInputId,
            "Track Note Input",
            noteInputSelection,
          ),
          ...externalMidiModules,
        ]),
    ...(controllerInputSelection === false || !runtime.controllerInputId
      ? []
      : [
          createMidiInputModule(
            runtime.controllerInputId,
            "Track Controller Input",
            controllerInputSelection,
          ),
        ]),
    createMidiMapperModule(
      runtime.midiMapperId,
      createOptions.midiMapper?.name ?? "Track Midi Mapper",
      createTrackMidiMapperProps(compiledTrack, createOptions),
    ),
    ...(controllerOutputSelection === false || !runtime.controllerOutputId
      ? []
      : [
          createMidiOutputModule(
            runtime.controllerOutputId,
            "Track Controller Output",
            controllerOutputSelection,
          ),
        ]),
    ...(runtime.masterId
      ? [
          createMasterModule(
            runtime.masterId,
            masterOptions !== false
              ? (masterOptions.name ?? "Track Master")
              : "Track Master",
          ),
        ]
      : []),
  ];
}
