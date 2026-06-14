import type { MidiPortSelection } from "@/core/midiPortSelection";
import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
import { createInstrumentMidiMapperProps } from "./createInstrumentMidiMapperProps";
import {
  createGlobalDelayModule,
  createGlobalReverbModule,
  createMasterFilterModule,
  createMasterModule,
  createMasterVolumeModule,
  createMidiInputModule,
  createMidiMapperModule,
  createMidiOutputModule,
  createStepSequencerModule,
  createTransportControlModule,
  type SerializableRuntimeModule,
} from "./instrumentRuntimeModules";
import type { InstrumentTrackNoteRuntime } from "./instrumentRuntimeRoutes";
import type { InstrumentMasterOptions } from "./instrumentRuntimeState";
import type {
  CompiledInstrument,
  CompiledInstrumentEnginePatch,
  CreateInstrumentEnginePatchOptions,
  InstrumentNavigationState,
} from "./instrumentTypes";

export function createInstrumentRuntimeModules(options: {
  document: InstrumentDocument;
  enabledTrackDocuments: readonly InstrumentTrackDocument[];
  compiledInstrument: CompiledInstrument;
  createOptions: CreateInstrumentEnginePatchOptions;
  runtime: CompiledInstrumentEnginePatch["runtime"];
  masterOptions: InstrumentMasterOptions;
  navigation: InstrumentNavigationState;
  globalMappings: CompiledInstrumentEnginePatch["runtime"]["midiMapperGlobalMappings"];
  noteInputSelection: MidiPortSelection | false;
  controllerInputSelection: MidiPortSelection | false;
  controllerOutputSelection: MidiPortSelection | false;
  trackNoteRuntimes: readonly InstrumentTrackNoteRuntime[];
}): SerializableRuntimeModule[] {
  const {
    document,
    enabledTrackDocuments,
    compiledInstrument,
    createOptions,
    runtime,
    masterOptions,
    navigation,
    globalMappings,
    noteInputSelection,
    controllerInputSelection,
    controllerOutputSelection,
    trackNoteRuntimes,
  } = options;

  return [
    createTransportControlModule(
      runtime.transportControlId,
      "Instrument Transport Control",
      document,
    ),
    createMasterFilterModule(
      runtime.masterFilterId,
      "Instrument Master Filter",
      document,
    ),
    createGlobalDelayModule(
      runtime.globalDelayId,
      "Instrument Global Delay",
      document,
    ),
    createGlobalReverbModule(
      runtime.globalReverbId,
      "Instrument Global Reverb",
      document,
    ),
    createMasterVolumeModule(
      runtime.masterVolumeId,
      "Instrument Master Volume",
      document,
    ),
    ...(noteInputSelection === false || !runtime.noteInputId
      ? []
      : [
          createMidiInputModule(
            runtime.noteInputId,
            "Instrument Note Input",
            noteInputSelection,
          ),
        ]),
    ...trackNoteRuntimes.flatMap(({ modules }) => modules),
    ...enabledTrackDocuments
      .filter((track) => track.noteSource === "stepSequencer")
      .map((track) =>
        createStepSequencerModule(
          runtime.stepSequencerIds[track.key]!,
          `${track.key} Step Sequencer`,
          track,
        ),
      ),
    ...(controllerInputSelection === false || !runtime.controllerInputId
      ? []
      : [
          createMidiInputModule(
            runtime.controllerInputId,
            "Instrument Controller Input",
            controllerInputSelection,
          ),
        ]),
    createMidiMapperModule(
      runtime.midiMapperId,
      createOptions.midiMapper?.name ?? "Instrument Midi Mapper",
      createInstrumentMidiMapperProps(
        compiledInstrument,
        navigation,
        globalMappings,
      ),
    ),
    ...(controllerOutputSelection === false || !runtime.controllerOutputId
      ? []
      : [
          createMidiOutputModule(
            runtime.controllerOutputId,
            "Instrument Controller Output",
            controllerOutputSelection,
          ),
        ]),
    ...(runtime.masterId
      ? [
          createMasterModule(
            runtime.masterId,
            masterOptions !== false
              ? (masterOptions.name ?? "Instrument Master")
              : "Instrument Master",
          ),
        ]
      : []),
  ];
}
