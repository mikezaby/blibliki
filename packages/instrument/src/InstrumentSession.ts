import {
  type IUpdateModule,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import {
  createMidiMapperUpdate,
  getSelectedMidiName,
} from "@/InstrumentSessionMidi";
import {
  type InstrumentPersistenceAction,
  InstrumentSessionPersistenceFlow,
} from "@/InstrumentSessionPersistence";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type {
  InstrumentDisplayNotice,
  InstrumentDisplayState,
} from "@/display/InstrumentDisplayState";
import {
  createLiveInstrumentDisplayState,
  type LiveDisplayEngine,
} from "@/display/LiveInstrumentDisplayState";
import { syncLaunchControlXL3NavigationButtonLeds } from "@/surfaces/launchControlXL3/LaunchControlXL3NavigationLeds";
import { launchControlXL3SequencerEdit } from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerEdit";
import { getActiveStepSequencerId } from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerState";
import { launchControlXL3Surface } from "@/surfaces/launchControlXL3/LaunchControlXL3Surface";

const SHIFT_CC = 63;

type ControllerInputDevice = {
  name: string;
  addEventListener: (callback: (event: MidiEvent) => void) => void;
  removeEventListener: (callback: (event: MidiEvent) => void) => void;
};

type MidiInputLookup = {
  findMidiInputDeviceByFuzzyName: (
    name: string,
    threshold?: number,
  ) => {
    device: ControllerInputDevice;
    score: number;
  } | null;
};

type EngineModuleUpdater = {
  updateModule: <T extends ModuleType>(params: IUpdateModule<T>) => unknown;
};

type EngineTransportController = {
  state?: TransportState;
  start: () => Promise<void> | void;
  stop: () => void;
  transport?: {
    addPropertyChangeCallback?: (
      property: "state",
      callback: (state: TransportState, actionAt: number) => void,
    ) => void;
  };
};

type EnginePropsObserver = {
  onPropsUpdate?: (
    callback: (params: {
      id: string;
      moduleType: ModuleType;
      state?: unknown;
    }) => void,
  ) => void;
};

type EngineStateUpdate = {
  id: string;
  moduleType: ModuleType;
  state?: unknown;
};

type EngineStateObserver = {
  onStateUpdate?: (callback: (params: EngineStateUpdate) => void) => void;
  removeStateUpdateCallback?: (
    callback: (params: EngineStateUpdate) => void,
  ) => void;
};

export type InstrumentControllerEngine = MidiInputLookup &
  EngineModuleUpdater &
  EngineTransportController &
  EnginePropsObserver &
  EngineStateObserver &
  LiveDisplayEngine;

export type CreateInstrumentControllerSessionOptions = {
  initialDisplayNotice?: InstrumentDisplayNotice;
  onRuntimePatchChange?: (runtimePatch: CompiledInstrumentEnginePatch) => void;
  onDisplayStateChange?: (displayState: InstrumentDisplayState) => void;
  onPersistenceAction?: (
    action: InstrumentPersistenceAction,
    runtimePatch: CompiledInstrumentEnginePatch,
  ) =>
    | Promise<InstrumentDisplayNotice | undefined>
    | InstrumentDisplayNotice
    | undefined;
};

export type InstrumentControllerSession = {
  getRuntimePatch: () => CompiledInstrumentEnginePatch;
  getDisplayState: () => InstrumentDisplayState;
  dispose: () => void;
};

function createDisplayState(
  engine: LiveDisplayEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  notice?: InstrumentDisplayNotice,
) {
  return createLiveInstrumentDisplayState(engine, runtimePatch, {
    notice,
  });
}

export class InstrumentSession implements InstrumentControllerSession {
  private currentRuntimePatch: CompiledInstrumentEnginePatch;
  private currentNotice: InstrumentDisplayNotice | undefined;
  private disposed = false;
  private readonly controllerInput: ControllerInputDevice | undefined;
  private readonly persistenceFlow: InstrumentSessionPersistenceFlow;

  constructor(
    private readonly engine: InstrumentControllerEngine,
    runtimePatch: CompiledInstrumentEnginePatch,
    private readonly options: CreateInstrumentControllerSessionOptions = {},
  ) {
    this.currentRuntimePatch = runtimePatch;
    this.currentNotice = options.initialDisplayNotice;
    this.persistenceFlow = new InstrumentSessionPersistenceFlow({
      isDisposed: () => this.disposed,
      onNoticeChange: (notice) => {
        this.currentNotice = notice;
      },
      onStateChange: () => {
        this.emitState();
      },
      onRunAction: options.onPersistenceAction,
    });

    const controllerInputName = getSelectedMidiName(
      runtimePatch,
      runtimePatch.runtime.controllerInputId,
    );
    this.controllerInput = controllerInputName
      ? engine.findMidiInputDeviceByFuzzyName(controllerInputName, 0.6)?.device
      : undefined;

    engine.onPropsUpdate?.(() => {
      this.emitState();
    });
    engine.transport?.addPropertyChangeCallback?.("state", () => {
      this.emitState();
    });
    engine.onStateUpdate?.(this.onEngineStateUpdate);

    this.controllerInput?.addEventListener(this.onMidiEvent);
    this.emitState();
  }

  getRuntimePatch(): CompiledInstrumentEnginePatch {
    return this.currentRuntimePatch;
  }

  getDisplayState(): InstrumentDisplayState {
    return createDisplayState(
      this.engine,
      this.currentRuntimePatch,
      this.currentNotice,
    );
  }

  dispose() {
    this.disposed = true;
    this.engine.removeStateUpdateCallback?.(this.onEngineStateUpdate);
    this.controllerInput?.removeEventListener(this.onMidiEvent);
  }

  private emitState() {
    if (this.disposed) {
      return;
    }

    launchControlXL3SequencerEdit.syncStepButtonLeds(
      this.engine,
      this.currentRuntimePatch,
    );
    syncLaunchControlXL3NavigationButtonLeds(
      this.engine,
      this.currentRuntimePatch,
    );
    this.options.onRuntimePatchChange?.(this.currentRuntimePatch);
    this.options.onDisplayStateChange?.(this.getDisplayState());
  }

  private handleMidiEvent(event: MidiEvent) {
    const result = launchControlXL3Surface.reduceEvent(
      this.currentRuntimePatch,
      event,
    );
    if (
      this.persistenceFlow.getPendingAction() &&
      event.cc !== SHIFT_CC &&
      event.ccValue === 127
    ) {
      const isMatchingPersistenceAction =
        result.command.type === "persistence" &&
        result.command.action === this.persistenceFlow.getPendingAction();
      if (!isMatchingPersistenceAction) {
        this.persistenceFlow.clearPendingAction();
      }
    }

    let didRuntimePatchChange =
      result.runtimePatch !== this.currentRuntimePatch;
    this.currentRuntimePatch = result.runtimePatch;

    if (result.command.type === "persistence") {
      void this.persistenceFlow.requestAction(
        result.command.action,
        this.currentRuntimePatch,
      );
      return;
    }

    if (
      result.command.type === "seqEdit.toggle" ||
      result.command.type === "seqEdit.page"
    ) {
      const sequencerPageSync = launchControlXL3SequencerEdit.createPageSync(
        this.currentRuntimePatch,
      );
      if (sequencerPageSync) {
        didRuntimePatchChange = true;
        this.currentRuntimePatch = sequencerPageSync.runtimePatch;
        this.engine.updateModule(sequencerPageSync.update);
      }
    }

    if (
      result.command.type === "navigation" ||
      result.command.type === "seqEdit.toggle"
    ) {
      this.engine.updateModule(
        createMidiMapperUpdate(this.currentRuntimePatch),
      );
    }

    if (
      result.command.type === "none" &&
      this.currentRuntimePatch.runtime.navigation.mode === "seqEdit" &&
      event.isCC &&
      event.cc !== undefined &&
      event.ccValue !== undefined
    ) {
      const seqEditUpdate = launchControlXL3SequencerEdit.applyEncoderEvent(
        this.currentRuntimePatch,
        event.cc,
        event.ccValue,
      );

      if (seqEditUpdate) {
        didRuntimePatchChange = true;
        this.currentRuntimePatch = seqEditUpdate.runtimePatch;
        this.engine.updateModule(seqEditUpdate.update);
      }
    }

    if (didRuntimePatchChange || result.command.type !== "none") {
      this.emitState();
    }
  }

  private readonly onMidiEvent = (event: MidiEvent) => {
    this.handleMidiEvent(event);
  };

  private readonly onEngineStateUpdate = (params: EngineStateUpdate) => {
    if (this.disposed) {
      return;
    }

    if (
      params.moduleType !== ModuleType.StepSequencer ||
      params.id !== getActiveStepSequencerId(this.currentRuntimePatch)
    ) {
      return;
    }

    launchControlXL3SequencerEdit.syncStepButtonLeds(
      this.engine,
      this.currentRuntimePatch,
    );
  };
}

export function createInstrumentControllerSession(
  engine: InstrumentControllerEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  options: CreateInstrumentControllerSessionOptions = {},
): InstrumentControllerSession {
  return new InstrumentSession(engine, runtimePatch, options);
}
