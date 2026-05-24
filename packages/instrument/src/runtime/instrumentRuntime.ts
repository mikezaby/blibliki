import {
  ModuleType,
  TransportState,
  type IMidiMapperProps,
} from "@blibliki/engine";
import { createInstrumentMidiMapperProps } from "@/compiler/createInstrumentMidiMapperProps";
import type {
  CompiledInstrumentEnginePatch,
  CompiledInstrumentLaunchControlXL3PageSummary,
  CompiledInstrumentTrack,
  InstrumentNavigationState,
} from "@/compiler/instrumentTypes";
import type { CompiledLaunchControlXL3Page } from "@/compiler/types";
import {
  InstrumentNavigation,
  type InstrumentNavigationAction,
} from "@/core/InstrumentNavigation";
import type { InstrumentGlobalBlock } from "@/document/types";
import type { InstrumentDisplayState } from "@/runtime/displayState";
import { createInstrumentDisplayState as createDisplayState } from "@/runtime/displayState";
import type { TrackPageKey } from "@/types";

export type { InstrumentNavigationAction } from "@/core/InstrumentNavigation";

export type InstrumentRuntimeState = {
  document: {
    version: string;
    name: string;
    templateId: string;
    hardwareProfileId: string;
  };
  patch: {
    bpm: number;
    timeSignature: [number, number];
    transportState: TransportState;
    runtime: CompiledInstrumentEnginePatch["runtime"];
  };
  globalBlock: InstrumentGlobalBlock;
  navigation: InstrumentNavigationState;
  activeTrack: CompiledInstrumentTrack;
  activePage: CompiledInstrumentLaunchControlXL3PageSummary;
  visiblePage: CompiledLaunchControlXL3Page;
};

type CreateInstrumentRuntimeStateOptions = {
  activeTrackIndex?: number;
  activePage?: TrackPageKey;
};

function getMidiMapperActiveTrackIndex(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const midiMapper = runtimePatch.patch.modules.find(
    (module) => module.id === runtimePatch.runtime.midiMapperId,
  );

  if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
    return 0;
  }

  return (midiMapper.props as IMidiMapperProps).activeTrack;
}

function getMidiMapperModuleIndex(runtimePatch: CompiledInstrumentEnginePatch) {
  return runtimePatch.patch.modules.findIndex(
    (module) => module.id === runtimePatch.runtime.midiMapperId,
  );
}

export function createInstrumentRuntimeState(
  runtimePatch: CompiledInstrumentEnginePatch,
  options: CreateInstrumentRuntimeStateOptions = {},
): InstrumentRuntimeState {
  const navigation = InstrumentNavigation.fromRuntimePatch(runtimePatch, {
    ...runtimePatch.runtime.navigation,
    activeTrackIndex:
      options.activeTrackIndex ?? getMidiMapperActiveTrackIndex(runtimePatch),
    activePage:
      options.activePage ?? runtimePatch.runtime.navigation.activePage,
  });

  return {
    document: {
      version: runtimePatch.compiledInstrument.version,
      name: runtimePatch.compiledInstrument.name,
      templateId: runtimePatch.compiledInstrument.templateId,
      hardwareProfileId: runtimePatch.compiledInstrument.hardwareProfileId,
    },
    patch: {
      bpm: runtimePatch.patch.bpm,
      timeSignature: runtimePatch.patch.timeSignature,
      transportState: TransportState.stopped,
      runtime: runtimePatch.runtime,
    },
    globalBlock: runtimePatch.compiledInstrument.globalBlock,
    navigation: navigation.serialize(),
    activeTrack: navigation.activeTrack,
    activePage: navigation.activePage,
    visiblePage: navigation.visiblePage,
  };
}

export function createInstrumentDisplayState(
  runtimeState: InstrumentRuntimeState,
): InstrumentDisplayState {
  return createDisplayState({
    instrumentName: runtimeState.document.name,
    trackName: runtimeState.activeTrack.name,
    pageKey: runtimeState.activePage.pageKey,
    controllerPage: runtimeState.activePage.controllerPage,
    midiChannel: runtimeState.activeTrack.midiChannel,
    transportState: runtimeState.patch.transportState,
    mode: runtimeState.navigation.mode,
    globalBlock: runtimeState.globalBlock,
    visiblePage: runtimeState.visiblePage,
  });
}

export function updateInstrumentRuntimeNavigation(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: Partial<InstrumentNavigationState>,
): CompiledInstrumentEnginePatch {
  const midiMapperModuleIndex = getMidiMapperModuleIndex(runtimePatch);
  if (midiMapperModuleIndex < 0) {
    throw new Error(
      "Instrument runtime patch is missing the midi mapper module",
    );
  }

  const midiMapperModule = runtimePatch.patch.modules[midiMapperModuleIndex];
  if (midiMapperModule?.moduleType !== ModuleType.MidiMapper) {
    throw new Error("Instrument runtime midi mapper module is invalid");
  }

  const nextNavigation = InstrumentNavigation.fromRuntimePatch(runtimePatch)
    .withChanges(navigation)
    .serialize();

  return {
    ...runtimePatch,
    runtime: {
      ...runtimePatch.runtime,
      navigation: nextNavigation,
    },
    patch: {
      ...runtimePatch.patch,
      modules: runtimePatch.patch.modules.map((module, index) =>
        index === midiMapperModuleIndex
          ? {
              ...module,
              props: createInstrumentMidiMapperProps(
                runtimePatch.compiledInstrument,
                nextNavigation,
                runtimePatch.runtime.midiMapperGlobalMappings,
              ),
            }
          : module,
      ),
    },
  };
}

export function navigateInstrumentRuntime(
  runtimePatch: CompiledInstrumentEnginePatch,
  action: InstrumentNavigationAction,
): CompiledInstrumentEnginePatch {
  const nextNavigation = InstrumentNavigation.fromRuntimePatch(runtimePatch)
    .navigate(action)
    .serialize();

  return updateInstrumentRuntimeNavigation(runtimePatch, nextNavigation);
}
