import {
  DEFAULT_CONTROLLER_INPUT,
  DEFAULT_CONTROLLER_OUTPUT,
  DEFAULT_NOTE_INPUT,
  excludeControllerFromAllNoteInputs,
  normalizePortSelection,
} from "@/core/midiPortSelection";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentDocument } from "@/document/types";
import { migrateInstrumentDocument } from "@/document/version";
import { createTrackFromDocument } from "@/tracks/createTrackFromDocument";
import { compileInstrument } from "./compileInstrument";
import {
  createInstrumentEncoderGlobalMappings,
  createInstrumentFaderGlobalMappings,
} from "./createInstrumentMidiMapperProps";
import { createInstrumentRuntimeModules } from "./createInstrumentRuntimeModules";
import { toEngineSerializableModule } from "./engineSerialization";
import { DEFAULT_INSTRUMENT_TIME_SIGNATURE } from "./instrumentRuntimeDefaults";
import {
  createInstrumentRuntimeRoutes,
  createTrackNoteRuntime,
} from "./instrumentRuntimeRoutes";
import {
  createInstrumentGlobalMappingRuntimeIds,
  createInstrumentRuntimeState,
  createInstrumentStepSequencerIds,
  isAudioBusTrack,
  isInstrumentTrackEnabled,
  isMasterTrack,
  normalizeInstrumentMasterOptions,
  normalizeInstrumentNavigation,
} from "./instrumentRuntimeState";
import type {
  CompiledInstrumentEnginePatch,
  CreateInstrumentEnginePatchOptions,
} from "./instrumentTypes";

export function createInstrumentEnginePatch(
  inputDocument: InstrumentDocument = createDefaultInstrumentDocument(),
  options: CreateInstrumentEnginePatchOptions = {},
): CompiledInstrumentEnginePatch {
  // Bring pre-v3 documents up to date (adds the master track) so every caller
  // gets a compilable instrument regardless of the stored version.
  const document = migrateInstrumentDocument(inputDocument);
  const enabledTrackDocuments = document.tracks.filter(
    isInstrumentTrackEnabled,
  );
  const compiledInstrument = compileInstrument(document, {
    trackVoices: options.trackVoices,
  });
  const trackInstances = enabledTrackDocuments.map((trackDocument) =>
    createTrackFromDocument(trackDocument, options.trackVoices),
  );
  const hasExternalMidiTracks = enabledTrackDocuments.some(
    (track) =>
      !isAudioBusTrack(track.audioSource) &&
      track.noteSource === "externalMidi",
  );
  const masterTrackKey = enabledTrackDocuments.find((track) =>
    isMasterTrack(track.audioSource),
  )?.key;
  if (!masterTrackKey) {
    throw new Error("Instrument must have an enabled master track");
  }
  const baseNoteInputSelection = normalizePortSelection(
    options.noteInput,
    DEFAULT_NOTE_INPUT,
  );
  const controllerInputSelection = normalizePortSelection(
    options.controllerInput,
    DEFAULT_CONTROLLER_INPUT,
  );
  const controllerOutputSelection = normalizePortSelection(
    options.controllerOutput,
    DEFAULT_CONTROLLER_OUTPUT,
  );
  const noteInputSelection = excludeControllerFromAllNoteInputs(
    baseNoteInputSelection,
    controllerInputSelection,
  );
  const navigation = normalizeInstrumentNavigation(compiledInstrument, options);
  const masterOptions = normalizeInstrumentMasterOptions(options.master);
  const globalMappingRuntimeIds = createInstrumentGlobalMappingRuntimeIds();
  const stepSequencerIds = createInstrumentStepSequencerIds(
    enabledTrackDocuments,
  );
  const globalMappings = [
    ...createInstrumentEncoderGlobalMappings(
      globalMappingRuntimeIds,
      masterTrackKey,
      stepSequencerIds,
    ),
    ...createInstrumentFaderGlobalMappings(compiledInstrument),
    ...(options.midiMapper?.globalMappings ?? []),
  ];

  const runtime = createInstrumentRuntimeState({
    createOptions: options,
    masterOptions,
    globalMappingRuntimeIds,
    selections: {
      noteInputSelection,
      controllerInputSelection,
      controllerOutputSelection,
    },
    hasExternalMidiTracks,
    globalMappings,
    navigation,
    stepSequencerIds,
  });
  const trackNoteRuntimes = enabledTrackDocuments.map((trackDocument, index) =>
    createTrackNoteRuntime(
      trackInstances[index]!,
      trackDocument,
      runtime.noteInputId,
      runtime.stepSequencerIds[trackDocument.key],
    ),
  );
  const runtimeModules = createInstrumentRuntimeModules({
    document,
    enabledTrackDocuments,
    compiledInstrument,
    createOptions: options,
    runtime,
    masterOptions,
    navigation,
    globalMappings,
    noteInputSelection,
    controllerInputSelection,
    controllerOutputSelection,
    trackNoteRuntimes,
  });

  const runtimeRoutes = createInstrumentRuntimeRoutes({
    trackDocuments: enabledTrackDocuments,
    trackInstances,
    runtime,
    trackNoteRuntimes,
  });
  const patchModules = [
    ...compiledInstrument.tracks.flatMap(
      (track) => track.compiledTrack.engine.modules,
    ),
    ...runtimeModules,
  ];

  return {
    compiledInstrument,
    runtime,
    patch: {
      bpm: options.bpm ?? document.globalBlock.tempo,
      timeSignature: options.timeSignature ?? [
        ...DEFAULT_INSTRUMENT_TIME_SIGNATURE,
      ],
      modules: patchModules.map(toEngineSerializableModule),
      routes: [
        ...compiledInstrument.tracks.flatMap(
          (track) => track.compiledTrack.engine.routes,
        ),
        ...runtimeRoutes,
      ],
    },
  };
}
