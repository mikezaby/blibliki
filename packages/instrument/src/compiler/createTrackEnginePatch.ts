import type {
  ICreateModule,
  IEngineSerialize,
  ModuleType,
  IRoute,
} from "@blibliki/engine";
import { ModuleType as EngineModuleType } from "@blibliki/engine";
import type { BlockPlug } from "@/blocks/types";
import type BaseTrack from "@/tracks/BaseTrack";
import { compileTrack } from "./compileTrack";
import { resolveTrackIO } from "./scoping";
import type {
  CompiledMidiMapperProps,
  CompiledTrack,
  CompiledTrackEnginePatch,
  CreateTrackEnginePatchOptions,
  MidiPortSelection,
} from "./types";

type RuntimeModule<T extends ModuleType> = ICreateModule<T> & { id: string };

const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIGNATURE = [4, 4] as const;
const DEFAULT_NOTE_INPUT: MidiPortSelection = {
  selectedId: "computer_keyboard",
  selectedName: "Computer Keyboard",
  allIns: false,
  excludedIds: [],
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

function createRuntimeModuleId(trackKey: string, suffix: string) {
  return `${trackKey}.runtime.${suffix}`;
}

function createRuntimeRouteId(
  trackKey: string,
  source: BlockPlug,
  destination: BlockPlug,
) {
  return `${trackKey}:runtime:${source.moduleId}.${source.ioName}->${destination.moduleId}.${destination.ioName}`;
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
  props: CompiledMidiMapperProps,
): RuntimeModule<ModuleType.MidiMapper> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiMapper,
    props,
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

function toEngineSerializableModule(
  module: RuntimeModule<ModuleType> & { voices?: number },
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
  trackKey: string,
  sourcePlugs: readonly BlockPlug[],
  destinationPlugs: readonly BlockPlug[],
): IRoute[] {
  const routes: IRoute[] = [];

  for (const source of sourcePlugs) {
    for (const destination of destinationPlugs) {
      routes.push({
        id: createRuntimeRouteId(trackKey, source, destination),
        source,
        destination,
      });
    }
  }

  return routes;
}

function createControllerRoutes(
  track: BaseTrack,
  controllerInputId: string | undefined,
  midiMapperId: string,
  controllerOutputId: string | undefined,
): IRoute[] {
  const routes: IRoute[] = [];

  if (controllerInputId) {
    routes.push({
      id: createRuntimeRouteId(
        track.key,
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
        track.key,
        { moduleId: midiMapperId, ioName: "midi out" },
        { moduleId: controllerOutputId, ioName: "midi in" },
      ),
      source: { moduleId: midiMapperId, ioName: "midi out" },
      destination: { moduleId: controllerOutputId, ioName: "midi in" },
    });
  }

  return routes;
}

function createMasterRoutes(track: BaseTrack, masterId: string): IRoute[] {
  const audioOut = track.findOutput("audio out");
  const destinationPlugs: BlockPlug[] = [{ moduleId: masterId, ioName: "in" }];

  return createExpandedRoutes(
    track.key,
    resolveTrackIO(track, audioOut, "output").plugs,
    destinationPlugs,
  );
}

function createMidiMapperProps(
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

export function createTrackEnginePatch(
  track: BaseTrack,
  options: CreateTrackEnginePatchOptions = {},
): CompiledTrackEnginePatch {
  const compiledTrack = compileTrack(track);
  const noteInputSelection = normalizePortSelection(
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
  const masterOptions =
    options.master === false ? false : (options.master ?? {});

  const runtime = {
    masterId:
      masterOptions === false
        ? undefined
        : (masterOptions.id ?? createRuntimeModuleId(track.key, "master")),
    midiMapperId:
      options.midiMapper?.id ?? createRuntimeModuleId(track.key, "midiMapper"),
    noteInputId:
      noteInputSelection === false
        ? undefined
        : createRuntimeModuleId(track.key, "noteInput"),
    controllerInputId:
      controllerInputSelection === false
        ? undefined
        : createRuntimeModuleId(track.key, "controllerInput"),
    controllerOutputId:
      controllerOutputSelection === false
        ? undefined
        : createRuntimeModuleId(track.key, "controllerOutput"),
  };
  const externalMidiRuntime =
    noteInputSelection === false || !runtime.noteInputId
      ? undefined
      : track.createExternalMidiRuntime({
          moduleId: runtime.noteInputId,
          ioName: "midi out",
        });

  const runtimeModules = [
    ...(noteInputSelection === false || !runtime.noteInputId
      ? []
      : [
          createMidiInputModule(
            runtime.noteInputId,
            "Track Note Input",
            noteInputSelection,
          ),
          ...(externalMidiRuntime?.modules ?? []),
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
      options.midiMapper?.name ?? "Track Midi Mapper",
      createMidiMapperProps(compiledTrack, options),
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

  const runtimeRoutes: IRoute[] = [
    ...(externalMidiRuntime?.routes ?? []),
    ...createControllerRoutes(
      track,
      runtime.controllerInputId,
      runtime.midiMapperId,
      runtime.controllerOutputId,
    ),
    ...(runtime.masterId ? createMasterRoutes(track, runtime.masterId) : []),
  ];

  return {
    compiledTrack,
    runtime,
    patch: {
      bpm: options.bpm ?? DEFAULT_BPM,
      timeSignature: options.timeSignature ?? [...DEFAULT_TIME_SIGNATURE],
      modules: [...compiledTrack.engine.modules, ...runtimeModules].map(
        toEngineSerializableModule,
      ),
      routes: [...compiledTrack.engine.routes, ...runtimeRoutes],
    },
  };
}
