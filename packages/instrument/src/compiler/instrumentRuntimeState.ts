import type { MidiPortSelection } from "@/core/midiPortSelection";
import {
  createInstrumentRuntimeModuleId,
  createTrackRuntimeModuleId,
} from "@/core/runtimeIds";
import type { InstrumentTrackDocument } from "@/document/types";
import { DEFAULT_ACTIVE_PAGE } from "./createInstrumentMidiMapperProps";
import type {
  CompiledInstrument,
  CompiledInstrumentEnginePatch,
  CreateInstrumentEnginePatchOptions,
  InstrumentNavigationState,
} from "./instrumentTypes";

export type InstrumentMasterOptions =
  | Exclude<NonNullable<CreateInstrumentEnginePatchOptions["master"]>, false>
  | false;

export type InstrumentRuntimePortSelections = {
  noteInputSelection: MidiPortSelection | false;
  controllerInputSelection: MidiPortSelection | false;
  controllerOutputSelection: MidiPortSelection | false;
};

export type InstrumentGlobalMappingRuntimeIds = ReturnType<
  typeof createInstrumentGlobalMappingRuntimeIds
>;

export function isInstrumentTrackEnabled(
  trackDocument: InstrumentTrackDocument,
) {
  return trackDocument.enabled !== false;
}

export function normalizeInstrumentMasterOptions(
  masterOptions: CreateInstrumentEnginePatchOptions["master"],
): InstrumentMasterOptions {
  return masterOptions === false ? false : (masterOptions ?? {});
}

export function createInstrumentGlobalMappingRuntimeIds() {
  return {
    transportControlId: createInstrumentRuntimeModuleId("transportControl"),
    masterFilterId: createInstrumentRuntimeModuleId("masterFilter"),
    globalDelayId: createInstrumentRuntimeModuleId("globalDelay"),
    globalReverbId: createInstrumentRuntimeModuleId("globalReverb"),
    masterVolumeId: createInstrumentRuntimeModuleId("masterVolume"),
  } as const;
}

export function createInstrumentStepSequencerIds(
  trackDocuments: readonly InstrumentTrackDocument[],
) {
  return Object.fromEntries(
    trackDocuments
      .filter(
        (track) =>
          track.audioSource?.type !== "track" &&
          track.noteSource === "stepSequencer",
      )
      .map((track) => [
        track.key,
        createTrackRuntimeModuleId(track.key, "stepSequencer"),
      ]),
  ) as Record<string, string>;
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

export function normalizeInstrumentNavigation(
  compiledInstrument: CompiledInstrument,
  options: CreateInstrumentEnginePatchOptions,
): InstrumentNavigationState {
  const requestedActiveTrackIndex =
    options.navigation?.activeTrackIndex ??
    options.midiMapper?.activeTrack ??
    0;

  const activeTrackIndex = normalizeActiveTrackIndex(
    compiledInstrument.tracks.length,
    requestedActiveTrackIndex,
  );
  const activeTrack = compiledInstrument.tracks[activeTrackIndex];
  const pageKeys =
    activeTrack?.compiledTrack.pages.map((page) => page.key) ?? [];
  const requestedActivePage =
    options.navigation?.activePage ?? DEFAULT_ACTIVE_PAGE;
  const activePage = pageKeys.includes(requestedActivePage)
    ? requestedActivePage
    : (pageKeys[0] ?? DEFAULT_ACTIVE_PAGE);

  return {
    activeTrackIndex,
    activePage,
    mode: options.navigation?.mode ?? "performance",
    shiftPressed: options.navigation?.shiftPressed ?? false,
    sequencerPageIndex: options.navigation?.sequencerPageIndex ?? 0,
    selectedStepIndex: options.navigation?.selectedStepIndex ?? 0,
  };
}

export function createInstrumentRuntimeState(options: {
  createOptions: CreateInstrumentEnginePatchOptions;
  masterOptions: InstrumentMasterOptions;
  globalMappingRuntimeIds: InstrumentGlobalMappingRuntimeIds;
  selections: InstrumentRuntimePortSelections;
  hasExternalMidiTracks: boolean;
  globalMappings: CompiledInstrumentEnginePatch["runtime"]["midiMapperGlobalMappings"];
  navigation: InstrumentNavigationState;
  stepSequencerIds: Record<string, string>;
}): CompiledInstrumentEnginePatch["runtime"] {
  const {
    createOptions,
    masterOptions,
    globalMappingRuntimeIds,
    selections,
    hasExternalMidiTracks,
    globalMappings,
    navigation,
    stepSequencerIds,
  } = options;

  return {
    masterId:
      masterOptions === false
        ? undefined
        : (masterOptions.id ?? createInstrumentRuntimeModuleId("master")),
    ...globalMappingRuntimeIds,
    midiMapperId:
      createOptions.midiMapper?.id ??
      createInstrumentRuntimeModuleId("midiMapper"),
    noteInputId:
      selections.noteInputSelection === false || !hasExternalMidiTracks
        ? undefined
        : createInstrumentRuntimeModuleId("noteInput"),
    controllerInputId:
      selections.controllerInputSelection === false
        ? undefined
        : createInstrumentRuntimeModuleId("controllerInput"),
    controllerOutputId:
      selections.controllerOutputSelection === false
        ? undefined
        : createInstrumentRuntimeModuleId("controllerOutput"),
    midiMapperGlobalMappings: globalMappings,
    navigation,
    stepSequencerIds,
  };
}
