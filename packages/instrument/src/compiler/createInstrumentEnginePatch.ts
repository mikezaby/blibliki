import {
  DEFAULT_CONTROLLER_INPUT,
  DEFAULT_CONTROLLER_OUTPUT,
  DEFAULT_NOTE_INPUT,
  excludeControllerFromAllNoteInputs,
  normalizePortSelection,
} from "@/core/midiPortSelection";
import {
  createInstrumentRuntimeModuleId,
  createTrackRuntimeModuleId,
} from "@/core/runtimeIds";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
import { createTrackFromDocument } from "@/tracks/createTrackFromDocument";
import { compileInstrument } from "./compileInstrument";
import {
  createInstrumentEncoderGlobalMappings,
  createInstrumentFaderGlobalMappings,
  createInstrumentMidiMapperProps,
  DEFAULT_ACTIVE_PAGE,
} from "./createInstrumentMidiMapperProps";
import { toEngineSerializableModule } from "./engineSerialization";
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
} from "./instrumentRuntimeModules";
import {
  createControllerRoutes,
  createMasterRoutes,
  createTrackNoteRuntime,
} from "./instrumentRuntimeRoutes";
import type {
  CompiledInstrumentEnginePatch,
  CreateInstrumentEnginePatchOptions,
  InstrumentNavigationState,
} from "./instrumentTypes";

const DEFAULT_TIME_SIGNATURE = [4, 4] as const;

function isTrackEnabled(trackDocument: InstrumentTrackDocument) {
  return trackDocument.enabled !== false;
}

function normalizeActiveTrackIndex(
  trackCount: number,
  activeTrackIndex: number,
) {
  if (trackCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(activeTrackIndex, 0), trackCount - 1);
}

export function createInstrumentEnginePatch(
  document: InstrumentDocument = createDefaultInstrumentDocument(),
  options: CreateInstrumentEnginePatchOptions = {},
): CompiledInstrumentEnginePatch {
  const enabledTrackDocuments = document.tracks.filter(isTrackEnabled);
  const compiledInstrument = compileInstrument(document, {
    trackVoices: options.trackVoices,
  });
  const trackInstances = enabledTrackDocuments.map((trackDocument) =>
    createTrackFromDocument(trackDocument, options.trackVoices),
  );
  const hasExternalMidiTracks = enabledTrackDocuments.some(
    (track) => track.noteSource === "externalMidi",
  );
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
  const requestedActiveTrackIndex =
    options.navigation?.activeTrackIndex ??
    options.midiMapper?.activeTrack ??
    0;
  const navigation: InstrumentNavigationState = {
    activeTrackIndex: normalizeActiveTrackIndex(
      compiledInstrument.tracks.length,
      requestedActiveTrackIndex,
    ),
    activePage: options.navigation?.activePage ?? DEFAULT_ACTIVE_PAGE,
    mode: options.navigation?.mode ?? "performance",
    shiftPressed: options.navigation?.shiftPressed ?? false,
    sequencerPageIndex: options.navigation?.sequencerPageIndex ?? 0,
    selectedStepIndex: options.navigation?.selectedStepIndex ?? 0,
  };
  const masterOptions =
    options.master === false ? false : (options.master ?? {});
  const globalMappingRuntimeIds = {
    transportControlId: createInstrumentRuntimeModuleId("transportControl"),
    masterFilterId: createInstrumentRuntimeModuleId("masterFilter"),
    globalDelayId: createInstrumentRuntimeModuleId("globalDelay"),
    globalReverbId: createInstrumentRuntimeModuleId("globalReverb"),
    masterVolumeId: createInstrumentRuntimeModuleId("masterVolume"),
  } as const;
  const globalMappings = [
    ...createInstrumentEncoderGlobalMappings(globalMappingRuntimeIds),
    ...createInstrumentFaderGlobalMappings(compiledInstrument),
    ...(options.midiMapper?.globalMappings ?? []),
  ];

  const runtime = {
    masterId:
      masterOptions === false
        ? undefined
        : (masterOptions.id ?? createInstrumentRuntimeModuleId("master")),
    ...globalMappingRuntimeIds,
    midiMapperId:
      options.midiMapper?.id ?? createInstrumentRuntimeModuleId("midiMapper"),
    noteInputId:
      noteInputSelection === false || !hasExternalMidiTracks
        ? undefined
        : createInstrumentRuntimeModuleId("noteInput"),
    controllerInputId:
      controllerInputSelection === false
        ? undefined
        : createInstrumentRuntimeModuleId("controllerInput"),
    controllerOutputId:
      controllerOutputSelection === false
        ? undefined
        : createInstrumentRuntimeModuleId("controllerOutput"),
    midiMapperGlobalMappings: globalMappings,
    navigation,
    stepSequencerIds: Object.fromEntries(
      enabledTrackDocuments
        .filter((track) => track.noteSource === "stepSequencer")
        .map((track) => [
          track.key,
          createTrackRuntimeModuleId(track.key, "stepSequencer"),
        ]),
    ) as Record<string, string>,
  };
  const trackNoteRuntimes = enabledTrackDocuments.map((trackDocument, index) =>
    createTrackNoteRuntime(
      trackInstances[index]!,
      trackDocument,
      runtime.noteInputId,
      runtime.stepSequencerIds[trackDocument.key],
    ),
  );
  const runtimeModules = [
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
      options.midiMapper?.name ?? "Instrument Midi Mapper",
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

  const runtimeRoutes = [
    ...trackNoteRuntimes.flatMap(({ routes }) => routes),
    ...createControllerRoutes(
      runtime.controllerInputId,
      runtime.midiMapperId,
      runtime.controllerOutputId,
    ),
    ...createMasterRoutes(trackInstances, runtime),
  ];
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
      timeSignature: options.timeSignature ?? [...DEFAULT_TIME_SIGNATURE],
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
