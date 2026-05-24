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
import {
  createInstrumentDisplayState,
  type InstrumentDisplayState,
} from "@/runtime/displayState";
import type { TrackPageKey } from "@/types";

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

export type CreateInstrumentRuntimeStateOptions = {
  activeTrackIndex?: number;
  activePage?: TrackPageKey;
};

function getMidiMapperModuleIndex(runtimePatch: CompiledInstrumentEnginePatch) {
  return runtimePatch.patch.modules.findIndex(
    (module) => module.id === runtimePatch.runtime.midiMapperId,
  );
}

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

function serializeNavigationToRuntimePatch(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: InstrumentNavigationState,
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

  return {
    ...runtimePatch,
    runtime: {
      ...runtimePatch.runtime,
      navigation,
    },
    patch: {
      ...runtimePatch.patch,
      modules: runtimePatch.patch.modules.map((module, index) =>
        index === midiMapperModuleIndex
          ? {
              ...module,
              props: createInstrumentMidiMapperProps(
                runtimePatch.compiledInstrument,
                navigation,
                runtimePatch.runtime.midiMapperGlobalMappings,
              ),
            }
          : module,
      ),
    },
  };
}

export class Instrument {
  private constructor(
    private readonly runtimePatch: CompiledInstrumentEnginePatch,
    private readonly navigation: InstrumentNavigation,
  ) {}

  static fromRuntimePatch(
    runtimePatch: CompiledInstrumentEnginePatch,
    options: CreateInstrumentRuntimeStateOptions = {},
  ) {
    return new Instrument(
      runtimePatch,
      InstrumentNavigation.fromRuntimePatch(runtimePatch, {
        ...runtimePatch.runtime.navigation,
        activeTrackIndex:
          options.activeTrackIndex ??
          getMidiMapperActiveTrackIndex(runtimePatch),
        activePage:
          options.activePage ?? runtimePatch.runtime.navigation.activePage,
      }),
    );
  }

  get runtimeState(): InstrumentRuntimeState {
    return {
      document: {
        version: this.runtimePatch.compiledInstrument.version,
        name: this.runtimePatch.compiledInstrument.name,
        templateId: this.runtimePatch.compiledInstrument.templateId,
        hardwareProfileId:
          this.runtimePatch.compiledInstrument.hardwareProfileId,
      },
      patch: {
        bpm: this.runtimePatch.patch.bpm,
        timeSignature: this.runtimePatch.patch.timeSignature,
        transportState: TransportState.stopped,
        runtime: this.runtimePatch.runtime,
      },
      globalBlock: this.runtimePatch.compiledInstrument.globalBlock,
      navigation: this.navigation.serialize(),
      activeTrack: this.navigation.activeTrack,
      activePage: this.navigation.activePage,
      visiblePage: this.navigation.visiblePage,
    };
  }

  get displayState(): InstrumentDisplayState {
    return Instrument.createDisplayState(this.runtimeState);
  }

  static createDisplayState(
    runtimeState: InstrumentRuntimeState,
  ): InstrumentDisplayState {
    return createInstrumentDisplayState({
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

  withNavigation(navigation: Partial<InstrumentNavigationState>): Instrument {
    const nextNavigation = this.navigation.withChanges(navigation);
    return new Instrument(
      serializeNavigationToRuntimePatch(
        this.runtimePatch,
        nextNavigation.serialize(),
      ),
      nextNavigation,
    );
  }

  navigate(action: InstrumentNavigationAction): Instrument {
    const nextNavigation = this.navigation.navigate(action);
    return new Instrument(
      serializeNavigationToRuntimePatch(
        this.runtimePatch,
        nextNavigation.serialize(),
      ),
      nextNavigation,
    );
  }

  serializeEnginePatch(): CompiledInstrumentEnginePatch {
    return this.runtimePatch;
  }
}
