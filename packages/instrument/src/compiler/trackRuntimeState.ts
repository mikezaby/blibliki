import type { MidiPortSelection } from "@/core/midiPortSelection";
import { createTrackRuntimeModuleId } from "@/core/runtimeIds";
import type {
  CompiledTrackEnginePatch,
  CreateTrackEnginePatchOptions,
} from "./types";

export type TrackMasterOptions =
  | Exclude<NonNullable<CreateTrackEnginePatchOptions["master"]>, false>
  | false;

export type TrackRuntimePortSelections = {
  noteInputSelection: MidiPortSelection | false;
  controllerInputSelection: MidiPortSelection | false;
  controllerOutputSelection: MidiPortSelection | false;
};

export function normalizeTrackMasterOptions(
  masterOptions: CreateTrackEnginePatchOptions["master"],
): TrackMasterOptions {
  return masterOptions === false ? false : (masterOptions ?? {});
}

export function createTrackRuntimeState(
  trackKey: string,
  options: CreateTrackEnginePatchOptions,
  masterOptions: TrackMasterOptions,
  selections: TrackRuntimePortSelections,
): CompiledTrackEnginePatch["runtime"] {
  return {
    masterId:
      masterOptions === false
        ? undefined
        : (masterOptions.id ?? createTrackRuntimeModuleId(trackKey, "master")),
    midiMapperId:
      options.midiMapper?.id ??
      createTrackRuntimeModuleId(trackKey, "midiMapper"),
    noteInputId:
      selections.noteInputSelection === false
        ? undefined
        : createTrackRuntimeModuleId(trackKey, "noteInput"),
    controllerInputId:
      selections.controllerInputSelection === false
        ? undefined
        : createTrackRuntimeModuleId(trackKey, "controllerInput"),
    controllerOutputId:
      selections.controllerOutputSelection === false
        ? undefined
        : createTrackRuntimeModuleId(trackKey, "controllerOutput"),
  };
}
