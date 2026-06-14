import {
  DEFAULT_CONTROLLER_INPUT,
  DEFAULT_CONTROLLER_OUTPUT,
  normalizePortSelection,
} from "@/core/midiPortSelection";
import type BaseTrack from "@/tracks/BaseTrack";
import { compileTrack } from "./compileTrack";
import { toEngineSerializableModule } from "./engineSerialization";
import {
  DEFAULT_TRACK_BPM,
  DEFAULT_TRACK_NOTE_INPUT,
  DEFAULT_TRACK_TIME_SIGNATURE,
} from "./trackRuntimeDefaults";
import { createTrackRuntimeModules } from "./trackRuntimeModules";
import {
  createTrackControllerRoutes,
  createTrackMasterRoutes,
} from "./trackRuntimeRoutes";
import {
  createTrackRuntimeState,
  normalizeTrackMasterOptions,
} from "./trackRuntimeState";
import type {
  CompiledTrackEnginePatch,
  CreateTrackEnginePatchOptions,
} from "./types";

export function createTrackEnginePatch(
  track: BaseTrack,
  options: CreateTrackEnginePatchOptions = {},
): CompiledTrackEnginePatch {
  const compiledTrack = compileTrack(track);
  const noteInputSelection = normalizePortSelection(
    options.noteInput,
    DEFAULT_TRACK_NOTE_INPUT,
  );
  const controllerInputSelection = normalizePortSelection(
    options.controllerInput,
    DEFAULT_CONTROLLER_INPUT,
  );
  const controllerOutputSelection = normalizePortSelection(
    options.controllerOutput,
    DEFAULT_CONTROLLER_OUTPUT,
  );
  const masterOptions = normalizeTrackMasterOptions(options.master);
  const runtime = createTrackRuntimeState(track.key, options, masterOptions, {
    noteInputSelection,
    controllerInputSelection,
    controllerOutputSelection,
  });
  const externalMidiRuntime =
    noteInputSelection === false || !runtime.noteInputId
      ? undefined
      : track.createExternalMidiRuntime({
          moduleId: runtime.noteInputId,
          ioName: "midi out",
        });

  const runtimeModules = createTrackRuntimeModules({
    runtime,
    compiledTrack,
    createOptions: options,
    masterOptions,
    noteInputSelection,
    controllerInputSelection,
    controllerOutputSelection,
    externalMidiModules: externalMidiRuntime?.modules,
  });

  const runtimeRoutes = [
    ...(externalMidiRuntime?.routes ?? []),
    ...createTrackControllerRoutes(
      track.key,
      runtime.controllerInputId,
      runtime.midiMapperId,
      runtime.controllerOutputId,
    ),
    ...(runtime.masterId
      ? createTrackMasterRoutes(track, runtime.masterId)
      : []),
  ];

  return {
    compiledTrack,
    runtime,
    patch: {
      bpm: options.bpm ?? DEFAULT_TRACK_BPM,
      timeSignature: options.timeSignature ?? [...DEFAULT_TRACK_TIME_SIGNATURE],
      modules: [...compiledTrack.engine.modules, ...runtimeModules].map(
        toEngineSerializableModule,
      ),
      routes: [...compiledTrack.engine.routes, ...runtimeRoutes],
    },
  };
}
