import {
  type IMidiMapperProps,
  type IUpdateModule,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type {
  InstrumentDisplayNotice,
  InstrumentDisplayState,
} from "@/display/InstrumentDisplayState";
import {
  createLiveInstrumentDisplayState,
  type LiveDisplayEngine,
} from "@/display/LiveInstrumentDisplayState";
import { launchControlXL3SequencerEdit } from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerEdit";
import { launchControlXL3Surface } from "@/surfaces/launchControlXL3/LaunchControlXL3Surface";

const NAVIGATION_LED_CCS = [102, 103, 106, 107] as const;
const NAVIGATION_LED_ON = 127;
const SHIFT_CC = 63;

const PERSISTENCE_CONFIRM_NOTICE: Record<
  "saveDraft" | "discardDraft",
  InstrumentDisplayNotice
> = {
  saveDraft: {
    title: "SAVE TO CLOUD?",
    message: "SHIFT+NEXT AGAIN",
    tone: "warning",
  },
  discardDraft: {
    title: "DISCARD DRAFT?",
    message: "SHIFT+PREV AGAIN",
    tone: "warning",
  },
};

const PERSISTENCE_PROGRESS_NOTICE: Record<
  "saveDraft" | "discardDraft",
  InstrumentDisplayNotice
> = {
  saveDraft: {
    title: "SAVING...",
    message: "Draft -> Firestore",
    tone: "info",
  },
  discardDraft: {
    title: "RELOADING...",
    message: "Loading Firestore",
    tone: "info",
  },
};

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

export type InstrumentControllerEngine = MidiInputLookup &
  EngineModuleUpdater &
  EngineTransportController &
  EnginePropsObserver &
  LiveDisplayEngine;

export type CreateInstrumentControllerSessionOptions = {
  initialDisplayNotice?: InstrumentDisplayNotice;
  onRuntimePatchChange?: (runtimePatch: CompiledInstrumentEnginePatch) => void;
  onDisplayStateChange?: (displayState: InstrumentDisplayState) => void;
  onPersistenceAction?: (
    action: "saveDraft" | "discardDraft",
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

function getSelectedMidiName(
  runtimePatch: CompiledInstrumentEnginePatch,
  moduleId: string | undefined,
) {
  if (!moduleId) {
    return;
  }

  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module?.moduleType !== ModuleType.MidiInput) {
    return;
  }

  const props = module.props as { selectedName?: unknown };
  return typeof props.selectedName === "string"
    ? props.selectedName
    : undefined;
}

function getMidiMapperProps(runtimePatch: CompiledInstrumentEnginePatch) {
  const midiMapper = runtimePatch.patch.modules.find(
    (module) => module.id === runtimePatch.runtime.midiMapperId,
  );
  if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
    throw new Error(
      "Instrument runtime patch is missing the midi mapper module",
    );
  }

  return midiMapper.props as IMidiMapperProps;
}

function createMidiMapperUpdate(
  runtimePatch: CompiledInstrumentEnginePatch,
): IUpdateModule<ModuleType.MidiMapper> {
  return {
    id: runtimePatch.runtime.midiMapperId,
    moduleType: ModuleType.MidiMapper,
    changes: {
      props: getMidiMapperProps(runtimePatch),
    },
  };
}

function createDisplayState(
  engine: LiveDisplayEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  notice?: InstrumentDisplayNotice,
) {
  return createLiveInstrumentDisplayState(engine, runtimePatch, {
    notice,
  });
}

function getPersistenceErrorNotice(
  action: "saveDraft" | "discardDraft",
  error: unknown,
): InstrumentDisplayNotice {
  return {
    title: action === "saveDraft" ? "SAVE FAILED" : "RELOAD FAILED",
    message: error instanceof Error ? error.message : String(error),
    tone: "error",
  };
}

function syncNavigationButtonLeds(
  engine: LiveDisplayEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const controllerOutputId = runtimePatch.runtime.controllerOutputId;
  if (!controllerOutputId) {
    return;
  }

  const controllerOutput = engine.findModule(controllerOutputId);
  if (
    controllerOutput.moduleType !== ModuleType.MidiOutput ||
    typeof controllerOutput.onMidiEvent !== "function"
  ) {
    return;
  }

  NAVIGATION_LED_CCS.forEach((cc) => {
    controllerOutput.onMidiEvent?.(MidiEvent.fromCC(cc, NAVIGATION_LED_ON, 0));
  });
}

export class InstrumentSession implements InstrumentControllerSession {
  private currentRuntimePatch: CompiledInstrumentEnginePatch;
  private currentNotice: InstrumentDisplayNotice | undefined;
  private pendingPersistenceAction: "saveDraft" | "discardDraft" | null = null;
  private persistenceActionInFlight = false;
  private disposed = false;
  private readonly controllerInput: ControllerInputDevice | undefined;

  constructor(
    private readonly engine: InstrumentControllerEngine,
    runtimePatch: CompiledInstrumentEnginePatch,
    private readonly options: CreateInstrumentControllerSessionOptions = {},
  ) {
    this.currentRuntimePatch = runtimePatch;
    this.currentNotice = options.initialDisplayNotice;

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
    syncNavigationButtonLeds(this.engine, this.currentRuntimePatch);
    this.options.onRuntimePatchChange?.(this.currentRuntimePatch);
    this.options.onDisplayStateChange?.(this.getDisplayState());
  }

  private clearPendingPersistenceAction() {
    this.pendingPersistenceAction = null;
    this.currentNotice = undefined;
  }

  private async handlePersistenceAction(action: "saveDraft" | "discardDraft") {
    if (this.persistenceActionInFlight) {
      this.emitState();
      return;
    }

    if (this.pendingPersistenceAction !== action) {
      this.pendingPersistenceAction = action;
      this.currentNotice = PERSISTENCE_CONFIRM_NOTICE[action];
      this.emitState();
      return;
    }

    this.pendingPersistenceAction = null;
    this.persistenceActionInFlight = true;
    this.currentNotice = PERSISTENCE_PROGRESS_NOTICE[action];
    this.emitState();

    try {
      const nextNotice = await this.options.onPersistenceAction?.(
        action,
        this.currentRuntimePatch,
      );
      if (this.disposed) {
        return;
      }

      this.currentNotice = nextNotice;
      this.emitState();
    } catch (error) {
      if (this.disposed) {
        return;
      }

      this.currentNotice = getPersistenceErrorNotice(action, error);
      this.emitState();
    } finally {
      this.persistenceActionInFlight = false;
    }
  }

  private handleMidiEvent(event: MidiEvent) {
    const result = launchControlXL3Surface.reduceEvent(
      this.currentRuntimePatch,
      event,
    );
    if (
      this.pendingPersistenceAction &&
      event.cc !== SHIFT_CC &&
      event.ccValue === 127
    ) {
      const isMatchingPersistenceAction =
        result.command.type === "persistence" &&
        result.command.action === this.pendingPersistenceAction;
      if (!isMatchingPersistenceAction) {
        this.clearPendingPersistenceAction();
      }
    }

    let didRuntimePatchChange =
      result.runtimePatch !== this.currentRuntimePatch;
    this.currentRuntimePatch = result.runtimePatch;

    if (result.command.type === "persistence") {
      void this.handlePersistenceAction(result.command.action);
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
}

export function createInstrumentControllerSession(
  engine: InstrumentControllerEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  options: CreateInstrumentControllerSessionOptions = {},
): InstrumentControllerSession {
  return new InstrumentSession(engine, runtimePatch, options);
}
