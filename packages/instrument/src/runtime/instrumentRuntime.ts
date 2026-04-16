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
import type { InstrumentGlobalBlock } from "@/document/types";
import type { InstrumentDisplayState } from "@/runtime/displayState";
import { createInstrumentDisplayState as createDisplayState } from "@/runtime/displayState";
import type { TrackPageKey } from "@/types";

export type InstrumentNavigationAction =
  | "nextTrack"
  | "previousTrack"
  | "nextPage"
  | "previousPage";

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

function isSequencerTrack(
  runtimePatch: CompiledInstrumentEnginePatch,
  activeTrackIndex: number,
) {
  return (
    runtimePatch.compiledInstrument.tracks[activeTrackIndex]?.noteSource ===
    "stepSequencer"
  );
}

function clampStepIndex(stepIndex: number) {
  return Math.max(0, Math.min(stepIndex, 15));
}

function wrapSequencerPageIndex(pageIndex: number) {
  return wrapIndex(pageIndex, 4);
}

function getPageKeys(runtimePatch: CompiledInstrumentEnginePatch) {
  const firstTrack = runtimePatch.compiledInstrument.tracks[0];
  if (!firstTrack) {
    throw new Error("Instrument has no tracks");
  }

  return firstTrack.compiledTrack.pages.map((page) => page.key);
}

function wrapIndex(nextIndex: number, length: number) {
  return ((nextIndex % length) + length) % length;
}

function normalizeNavigation(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: InstrumentNavigationState,
): InstrumentNavigationState {
  const activeTrackIndex = wrapIndex(
    navigation.activeTrackIndex,
    runtimePatch.compiledInstrument.tracks.length,
  );
  const pageKeys = getPageKeys(runtimePatch);
  const activePage = pageKeys.includes(navigation.activePage)
    ? navigation.activePage
    : runtimePatch.runtime.navigation.activePage;
  const sequencerTrack = isSequencerTrack(runtimePatch, activeTrackIndex);

  return {
    activeTrackIndex,
    activePage,
    mode:
      sequencerTrack && navigation.mode === "seqEdit"
        ? "seqEdit"
        : "performance",
    shiftPressed: navigation.shiftPressed,
    sequencerPageIndex: wrapSequencerPageIndex(navigation.sequencerPageIndex),
    selectedStepIndex: clampStepIndex(navigation.selectedStepIndex),
  };
}

function getMidiMapperActiveTrackIndex(
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const midiMapper = runtimePatch.patch.modules.find(
    (module) => module.id === runtimePatch.runtime.midiMapperId,
  );

  if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
    return 0;
  }

  return (midiMapper.props as IMidiMapperProps).activeTrack;
}

function resolveActivePage(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: InstrumentNavigationState,
): CompiledInstrumentLaunchControlXL3PageSummary {
  const activePage =
    runtimePatch.compiledInstrument.launchControlXL3.pages.find(
      (page) =>
        page.trackIndex === navigation.activeTrackIndex &&
        page.pageKey === navigation.activePage,
    ) ?? runtimePatch.compiledInstrument.launchControlXL3.pages[0];

  if (!activePage) {
    throw new Error("Instrument has no LaunchControlXL3 pages");
  }

  return activePage;
}

function resolveActiveTrack(
  runtimePatch: CompiledInstrumentEnginePatch,
  activeTrackIndex: number,
) {
  const activeTrack = runtimePatch.compiledInstrument.tracks[activeTrackIndex];

  if (!activeTrack) {
    throw new Error(`Track ${activeTrackIndex} not found in instrument`);
  }

  return activeTrack;
}

function resolveVisiblePage(
  activeTrack: CompiledInstrumentTrack,
  activePage: CompiledInstrumentLaunchControlXL3PageSummary,
) {
  const visiblePage =
    activeTrack.compiledTrack.launchControlXL3.resolvedPages.find(
      (page) => page.pageKey === activePage.pageKey,
    );

  if (!visiblePage) {
    throw new Error(
      `Page ${activePage.pageKey} not found for track ${activeTrack.key}`,
    );
  }

  return visiblePage;
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
  const navigation = normalizeNavigation(runtimePatch, {
    ...runtimePatch.runtime.navigation,
    activeTrackIndex:
      options.activeTrackIndex ?? getMidiMapperActiveTrackIndex(runtimePatch),
    activePage:
      options.activePage ?? runtimePatch.runtime.navigation.activePage,
  });
  const activePage = resolveActivePage(runtimePatch, navigation);
  const activeTrack = resolveActiveTrack(
    runtimePatch,
    navigation.activeTrackIndex,
  );
  const visiblePage = resolveVisiblePage(activeTrack, activePage);

  return {
    document: {
      version: runtimePatch.compiledInstrument.version,
      name: runtimePatch.compiledInstrument.name,
      templateId: runtimePatch.compiledInstrument.templateId,
      hardwareProfileId: runtimePatch.compiledInstrument.hardwareProfileId,
    },
    patch: {
      bpm: runtimePatch.patch.bpm,
      timeSignature: runtimePatch.patch.timeSignature as [number, number],
      transportState: TransportState.stopped,
      runtime: runtimePatch.runtime,
    },
    globalBlock: runtimePatch.compiledInstrument.globalBlock,
    navigation,
    activeTrack,
    activePage,
    visiblePage,
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
  if (
    !midiMapperModule ||
    midiMapperModule.moduleType !== ModuleType.MidiMapper
  ) {
    throw new Error("Instrument runtime midi mapper module is invalid");
  }

  const nextNavigation = normalizeNavigation(runtimePatch, {
    activeTrackIndex:
      navigation.activeTrackIndex ??
      runtimePatch.runtime.navigation.activeTrackIndex,
    activePage:
      navigation.activePage ?? runtimePatch.runtime.navigation.activePage,
    mode: navigation.mode ?? runtimePatch.runtime.navigation.mode,
    shiftPressed:
      navigation.shiftPressed ?? runtimePatch.runtime.navigation.shiftPressed,
    sequencerPageIndex:
      navigation.sequencerPageIndex ??
      runtimePatch.runtime.navigation.sequencerPageIndex,
    selectedStepIndex:
      navigation.selectedStepIndex ??
      runtimePatch.runtime.navigation.selectedStepIndex,
  });

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
  const currentNavigation = runtimePatch.runtime.navigation;
  if (currentNavigation.mode === "seqEdit") {
    switch (action) {
      case "nextTrack":
        return updateInstrumentRuntimeNavigation(runtimePatch, {
          activeTrackIndex: currentNavigation.activeTrackIndex + 1,
        });
      case "previousTrack":
        return updateInstrumentRuntimeNavigation(runtimePatch, {
          activeTrackIndex: currentNavigation.activeTrackIndex - 1,
        });
      case "nextPage":
        return updateInstrumentRuntimeNavigation(runtimePatch, {
          sequencerPageIndex: currentNavigation.sequencerPageIndex + 1,
        });
      case "previousPage":
        return updateInstrumentRuntimeNavigation(runtimePatch, {
          sequencerPageIndex: currentNavigation.sequencerPageIndex - 1,
        });
    }
  }

  const pageKeys = getPageKeys(runtimePatch);
  const currentPageIndex = pageKeys.indexOf(currentNavigation.activePage);

  switch (action) {
    case "nextTrack":
      return updateInstrumentRuntimeNavigation(runtimePatch, {
        activeTrackIndex: currentNavigation.activeTrackIndex + 1,
      });
    case "previousTrack":
      return updateInstrumentRuntimeNavigation(runtimePatch, {
        activeTrackIndex: currentNavigation.activeTrackIndex - 1,
      });
    case "nextPage":
      return updateInstrumentRuntimeNavigation(runtimePatch, {
        activePage:
          pageKeys[wrapIndex(currentPageIndex + 1, pageKeys.length)] ??
          currentNavigation.activePage,
      });
    case "previousPage":
      return updateInstrumentRuntimeNavigation(runtimePatch, {
        activePage:
          pageKeys[wrapIndex(currentPageIndex - 1, pageKeys.length)] ??
          currentNavigation.activePage,
      });
  }
}
