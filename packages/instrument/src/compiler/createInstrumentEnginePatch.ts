import type {
  ICreateModule,
  IEngineSerialize,
  IRoute,
  ModuleType,
} from "@blibliki/engine";
import {
  DelayTimeMode,
  ModuleType as EngineModuleType,
  ReverbType,
} from "@blibliki/engine";
import type { BlockPlug } from "@/blocks/types";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
import type BaseTrack from "@/tracks/BaseTrack";
import { createTrackFromDocument } from "@/tracks/createTrackFromDocument";
import { compileInstrument } from "./compileInstrument";
import {
  createInstrumentEncoderGlobalMappings,
  createInstrumentFaderGlobalMappings,
  createInstrumentMidiMapperProps,
  DEFAULT_ACTIVE_PAGE,
} from "./createInstrumentMidiMapperProps";
import type {
  CompiledInstrumentEnginePatch,
  CompiledInstrumentMidiMapperProps,
  CreateInstrumentEnginePatchOptions,
  InstrumentNavigationState,
} from "./instrumentTypes";
import { scopeTrackIO } from "./scoping";
import type { MidiPortSelection } from "./types";

type RuntimeModule<T extends ModuleType> = ICreateModule<T> & { id: string };
type SerializableRuntimeModule = RuntimeModule<ModuleType> & {
  voices?: number;
};

const DEFAULT_TIME_SIGNATURE = [4, 4] as const;
const DEFAULT_NOTE_INPUT: MidiPortSelection = {
  selectedId: null,
  selectedName: "All ins",
  allIns: true,
  excludedIds: ["computer_keyboard"],
  excludedNames: [],
};
const DEFAULT_CONTROLLER_INPUT: MidiPortSelection = {
  selectedId: null,
  selectedName: "LCXL3 DAW In",
  allIns: false,
  excludedIds: [],
  excludedNames: [],
};
const DEFAULT_CONTROLLER_OUTPUT: MidiPortSelection = {
  selectedId: null,
  selectedName: "LCXL3 DAW Out",
  allIns: false,
  excludedIds: [],
  excludedNames: [],
};

function isTrackEnabled(trackDocument: InstrumentTrackDocument) {
  return trackDocument.enabled !== false;
}

function createRuntimeModuleId(suffix: string) {
  return `instrument.runtime.${suffix}`;
}

function createTrackRuntimeModuleId(trackKey: string, suffix: string) {
  return `${trackKey}.runtime.${suffix}`;
}

function createRuntimeRouteId(
  source: BlockPlug,
  destination: BlockPlug,
  scope = "instrument",
) {
  return `${scope}:runtime:${source.moduleId}.${source.ioName}->${destination.moduleId}.${destination.ioName}`;
}

function normalizePortSelection(
  selection: MidiPortSelection | false | undefined,
  defaults: MidiPortSelection,
) {
  if (selection === false) {
    return false;
  }

  return {
    selectedId: selection?.selectedId ?? defaults.selectedId ?? null,
    selectedName: selection?.selectedName ?? defaults.selectedName ?? null,
    allIns: selection?.allIns ?? defaults.allIns ?? false,
    excludedIds: selection?.excludedIds ?? defaults.excludedIds ?? [],
    excludedNames: selection?.excludedNames ?? defaults.excludedNames ?? [],
  };
}

function withControllerExcluded(
  noteInputSelection: MidiPortSelection | false,
  controllerInputSelection: MidiPortSelection | false,
) {
  if (noteInputSelection === false || controllerInputSelection === false) {
    return noteInputSelection;
  }

  if (!noteInputSelection.allIns) {
    return noteInputSelection;
  }

  return {
    ...noteInputSelection,
    excludedIds: Array.from(
      new Set([
        ...(noteInputSelection.excludedIds ?? []),
        ...(controllerInputSelection.selectedId
          ? [controllerInputSelection.selectedId]
          : []),
      ]),
    ),
    excludedNames: Array.from(
      new Set([
        ...(noteInputSelection.excludedNames ?? []),
        ...(controllerInputSelection.selectedName
          ? [controllerInputSelection.selectedName]
          : []),
      ]),
    ),
  };
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

function createMidiInputModule(
  id: string,
  name: string,
  selection: MidiPortSelection,
): RuntimeModule<ModuleType.MidiInput> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiInput,
    props: {
      selectedId: selection.selectedId ?? null,
      selectedName: selection.selectedName ?? null,
      allIns: selection.allIns ?? false,
      excludedIds: selection.excludedIds ?? [],
      excludedNames: selection.excludedNames ?? [],
    },
  };
}

function createMidiOutputModule(
  id: string,
  name: string,
  selection: MidiPortSelection,
): RuntimeModule<ModuleType.MidiOutput> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiOutput,
    props: {
      selectedId: selection.selectedId ?? null,
      selectedName: selection.selectedName ?? null,
    },
  };
}

function createMidiMapperModule(
  id: string,
  name: string,
  props: CompiledInstrumentMidiMapperProps,
): RuntimeModule<ModuleType.MidiMapper> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiMapper,
    props,
  };
}

function createStepSequencerModule(
  id: string,
  name: string,
  trackDocument: InstrumentTrackDocument,
): RuntimeModule<ModuleType.StepSequencer> {
  const compiledPages = trackDocument.sequencer.pages.map((page) => ({
    name: page.name,
    steps: page.steps.map((step) => ({
      active: step.active,
      notes: step.notes.map((note) => ({
        note: note.note,
        velocity: note.velocity,
      })),
      ccMessages: [],
      probability: step.probability,
      microtimeOffset: step.microtimeOffset,
      duration: step.duration,
    })),
  }));

  return {
    id,
    name,
    moduleType: EngineModuleType.StepSequencer,
    props: {
      patterns: [
        {
          name: "A",
          pages: compiledPages,
        },
      ],
      activePatternNo: 0,
      activePageNo: 0,
      loopLength: trackDocument.sequencer.loopLength,
      stepsPerPage: 16,
      resolution: trackDocument.sequencer.resolution,
      playbackMode: trackDocument.sequencer.playbackMode,
      patternSequence: "",
      enableSequence: false,
    },
  };
}

function createMasterModule(
  id: string,
  name: string,
): RuntimeModule<ModuleType.Master> {
  return {
    id,
    name,
    moduleType: EngineModuleType.Master,
    props: {},
  };
}

function createTransportControlModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.TransportControl> {
  return {
    id,
    name,
    moduleType: EngineModuleType.TransportControl,
    props: {
      bpm: document.globalBlock.tempo,
      swing: document.globalBlock.swing,
    },
  };
}

function createMasterFilterModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Filter> & { voices: number } {
  return {
    id,
    name,
    moduleType: EngineModuleType.Filter,
    voices: 1,
    props: {
      cutoff: document.globalBlock.masterFilterCutoff,
      envelopeAmount: 0,
      type: "lowpass",
      Q: document.globalBlock.masterFilterResonance,
    },
  };
}

function createGlobalDelayModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Delay> {
  return {
    id,
    name,
    moduleType: EngineModuleType.Delay,
    props: {
      time: 250,
      timeMode: DelayTimeMode.short,
      sync: false,
      division: "1/4",
      feedback: 0.3,
      mix: document.globalBlock.delaySend,
      stereo: false,
    },
  };
}

function createGlobalReverbModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Reverb> {
  return {
    id,
    name,
    moduleType: EngineModuleType.Reverb,
    props: {
      mix: document.globalBlock.reverbSend,
      decayTime: 1.5,
      preDelay: 0,
      type: ReverbType.room,
    },
  };
}

function createMasterVolumeModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Gain> & { voices: number } {
  return {
    id,
    name,
    moduleType: EngineModuleType.Gain,
    voices: 1,
    props: {
      gain: document.globalBlock.masterVolume,
    },
  };
}

function toEngineSerializableModule(
  module: SerializableRuntimeModule,
): IEngineSerialize["modules"][number] {
  if (module.voices !== undefined) {
    return {
      ...module,
      voices: module.voices,
      inputs: [],
      outputs: [],
    };
  }

  return {
    ...module,
    voiceNo: 0,
    inputs: [],
    outputs: [],
  };
}

function createExpandedRoutes(
  scope: string,
  sourcePlugs: readonly BlockPlug[],
  destinationPlugs: readonly BlockPlug[],
): IRoute[] {
  const routes: IRoute[] = [];

  for (const source of sourcePlugs) {
    for (const destination of destinationPlugs) {
      routes.push({
        id: createRuntimeRouteId(source, destination, scope),
        source,
        destination,
      });
    }
  }

  return routes;
}

function createTrackNoteRuntime(
  track: BaseTrack,
  trackDocument: InstrumentTrackDocument,
  noteInputId: string | undefined,
  stepSequencerId: string | undefined,
): {
  modules: SerializableRuntimeModule[];
  routes: IRoute[];
} {
  if (trackDocument.noteSource === "stepSequencer") {
    if (!stepSequencerId) {
      return { modules: [], routes: [] };
    }

    return track.createInternalMidiRuntime(
      { moduleId: stepSequencerId, ioName: "midi" },
      { scopeBlockPlugs: true },
    );
  }

  if (!noteInputId) {
    return { modules: [], routes: [] };
  }

  return track.createExternalMidiRuntime(
    {
      moduleId: noteInputId,
      ioName: "midi out",
    },
    { scopeBlockPlugs: true },
  );
}

function createMasterRoutes(
  tracks: readonly BaseTrack[],
  runtime: Pick<
    CompiledInstrumentEnginePatch["runtime"],
    | "masterId"
    | "masterFilterId"
    | "globalDelayId"
    | "globalReverbId"
    | "masterVolumeId"
  >,
): IRoute[] {
  const mixDestinationPlugs: BlockPlug[] = [
    { moduleId: runtime.masterFilterId, ioName: "in" },
  ];

  return [
    ...tracks.flatMap((track) =>
      createExpandedRoutes(
        track.key,
        scopeTrackIO(track.key, track, track.findOutput("audio out"), "output")
          .plugs,
        mixDestinationPlugs,
      ),
    ),
    {
      id: createRuntimeRouteId(
        { moduleId: runtime.masterFilterId, ioName: "out" },
        { moduleId: runtime.globalDelayId, ioName: "in" },
      ),
      source: { moduleId: runtime.masterFilterId, ioName: "out" },
      destination: { moduleId: runtime.globalDelayId, ioName: "in" },
    },
    {
      id: createRuntimeRouteId(
        { moduleId: runtime.globalDelayId, ioName: "out" },
        { moduleId: runtime.globalReverbId, ioName: "in" },
      ),
      source: { moduleId: runtime.globalDelayId, ioName: "out" },
      destination: { moduleId: runtime.globalReverbId, ioName: "in" },
    },
    {
      id: createRuntimeRouteId(
        { moduleId: runtime.globalReverbId, ioName: "out" },
        { moduleId: runtime.masterVolumeId, ioName: "in" },
      ),
      source: { moduleId: runtime.globalReverbId, ioName: "out" },
      destination: { moduleId: runtime.masterVolumeId, ioName: "in" },
    },
    ...(runtime.masterId
      ? [
          {
            id: createRuntimeRouteId(
              { moduleId: runtime.masterVolumeId, ioName: "out" },
              { moduleId: runtime.masterId, ioName: "in" },
            ),
            source: { moduleId: runtime.masterVolumeId, ioName: "out" },
            destination: { moduleId: runtime.masterId, ioName: "in" },
          },
        ]
      : []),
  ];
}

function createControllerRoutes(
  controllerInputId: string | undefined,
  midiMapperId: string,
  controllerOutputId: string | undefined,
): IRoute[] {
  const routes: IRoute[] = [];

  if (controllerInputId) {
    routes.push({
      id: createRuntimeRouteId(
        { moduleId: controllerInputId, ioName: "midi out" },
        { moduleId: midiMapperId, ioName: "midi in" },
      ),
      source: { moduleId: controllerInputId, ioName: "midi out" },
      destination: { moduleId: midiMapperId, ioName: "midi in" },
    });
  }

  if (controllerOutputId) {
    routes.push({
      id: createRuntimeRouteId(
        { moduleId: midiMapperId, ioName: "midi out" },
        { moduleId: controllerOutputId, ioName: "midi in" },
      ),
      source: { moduleId: midiMapperId, ioName: "midi out" },
      destination: { moduleId: controllerOutputId, ioName: "midi in" },
    });
  }

  return routes;
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
  const noteInputSelection = withControllerExcluded(
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
    transportControlId: createRuntimeModuleId("transportControl"),
    masterFilterId: createRuntimeModuleId("masterFilter"),
    globalDelayId: createRuntimeModuleId("globalDelay"),
    globalReverbId: createRuntimeModuleId("globalReverb"),
    masterVolumeId: createRuntimeModuleId("masterVolume"),
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
        : (masterOptions.id ?? createRuntimeModuleId("master")),
    ...globalMappingRuntimeIds,
    midiMapperId: options.midiMapper?.id ?? createRuntimeModuleId("midiMapper"),
    noteInputId:
      noteInputSelection === false || !hasExternalMidiTracks
        ? undefined
        : createRuntimeModuleId("noteInput"),
    controllerInputId:
      controllerInputSelection === false
        ? undefined
        : createRuntimeModuleId("controllerInput"),
    controllerOutputId:
      controllerOutputSelection === false
        ? undefined
        : createRuntimeModuleId("controllerOutput"),
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
