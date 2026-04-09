import {
  type IMidiMapperProps,
  type IUpdateModule,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
  InstrumentDisplayNotice,
  InstrumentDisplayState,
} from "@blibliki/instrument";
import { reduceInstrumentControllerEvent } from "@/controllerRuntime";
import {
  createLiveInstrumentDisplayState,
  type LiveDisplayEngine,
} from "@/liveDisplayState";
import {
  applySeqEditEncoderEvent,
  createSeqEditPageSync,
  syncSeqEditStepButtonLeds,
} from "@/sequencerEdit";

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
  if (!module || module.moduleType !== ModuleType.MidiInput) {
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
  if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
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

export function createInstrumentControllerSession(
  engine: InstrumentControllerEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  options: CreateInstrumentControllerSessionOptions = {},
): InstrumentControllerSession {
  let currentRuntimePatch = runtimePatch;
  let currentNotice = options.initialDisplayNotice;
  let pendingPersistenceAction: "saveDraft" | "discardDraft" | null = null;
  let persistenceActionInFlight = false;
  let disposed = false;
  const controllerInputName = getSelectedMidiName(
    runtimePatch,
    runtimePatch.runtime.controllerInputId,
  );
  const controllerInput = controllerInputName
    ? engine.findMidiInputDeviceByFuzzyName(controllerInputName, 0.6)?.device
    : undefined;

  const emitState = () => {
    if (disposed) {
      return;
    }

    syncSeqEditStepButtonLeds(engine, currentRuntimePatch);
    syncNavigationButtonLeds(engine, currentRuntimePatch);
    options.onRuntimePatchChange?.(currentRuntimePatch);
    options.onDisplayStateChange?.(
      createDisplayState(engine, currentRuntimePatch, currentNotice),
    );
  };

  const clearPendingPersistenceAction = () => {
    pendingPersistenceAction = null;
    currentNotice = undefined;
  };

  const handlePersistenceAction = async (
    action: "saveDraft" | "discardDraft",
  ) => {
    if (persistenceActionInFlight) {
      emitState();
      return;
    }

    if (pendingPersistenceAction !== action) {
      pendingPersistenceAction = action;
      currentNotice = PERSISTENCE_CONFIRM_NOTICE[action];
      emitState();
      return;
    }

    pendingPersistenceAction = null;
    persistenceActionInFlight = true;
    currentNotice = PERSISTENCE_PROGRESS_NOTICE[action];
    emitState();

    try {
      const nextNotice = await options.onPersistenceAction?.(
        action,
        currentRuntimePatch,
      );
      if (disposed) {
        return;
      }

      currentNotice = nextNotice;
      emitState();
    } catch (error) {
      if (disposed) {
        return;
      }

      currentNotice = getPersistenceErrorNotice(action, error);
      emitState();
    } finally {
      persistenceActionInFlight = false;
    }
  };

  engine.onPropsUpdate?.(() => {
    emitState();
  });
  engine.transport?.addPropertyChangeCallback?.("state", () => {
    emitState();
  });

  const handleMidiEvent = (event: MidiEvent) => {
    const result = reduceInstrumentControllerEvent(currentRuntimePatch, event);
    if (
      pendingPersistenceAction &&
      event.cc !== SHIFT_CC &&
      event.ccValue === 127
    ) {
      const isMatchingPersistenceAction =
        result.command.type === "persistence" &&
        result.command.action === pendingPersistenceAction;
      if (!isMatchingPersistenceAction) {
        clearPendingPersistenceAction();
      }
    }

    let didRuntimePatchChange = result.runtimePatch !== currentRuntimePatch;
    currentRuntimePatch = result.runtimePatch;

    if (result.command.type === "persistence") {
      void handlePersistenceAction(result.command.action);
      return;
    }

    if (
      result.command.type === "seqEdit.toggle" ||
      result.command.type === "seqEdit.page"
    ) {
      const sequencerPageSync = createSeqEditPageSync(currentRuntimePatch);
      if (sequencerPageSync) {
        didRuntimePatchChange = true;
        currentRuntimePatch = sequencerPageSync.runtimePatch;
        engine.updateModule(sequencerPageSync.update);
      }
    }

    if (
      result.command.type === "navigation" ||
      result.command.type === "seqEdit.toggle"
    ) {
      engine.updateModule(createMidiMapperUpdate(currentRuntimePatch));
    }

    if (
      result.command.type === "none" &&
      currentRuntimePatch.runtime.navigation.mode === "seqEdit" &&
      event.isCC &&
      event.cc !== undefined &&
      event.ccValue !== undefined
    ) {
      const seqEditUpdate = applySeqEditEncoderEvent(
        currentRuntimePatch,
        event.cc,
        event.ccValue,
      );

      if (seqEditUpdate) {
        didRuntimePatchChange = true;
        currentRuntimePatch = seqEditUpdate.runtimePatch;
        engine.updateModule(seqEditUpdate.update);
      }
    }

    if (didRuntimePatchChange || result.command.type !== "none") {
      emitState();
    }
  };

  const onMidiEvent = (event: MidiEvent) => {
    handleMidiEvent(event);
  };

  controllerInput?.addEventListener(onMidiEvent);
  emitState();

  return {
    getRuntimePatch: () => currentRuntimePatch,
    getDisplayState: () =>
      createDisplayState(engine, currentRuntimePatch, currentNotice),
    dispose: () => {
      disposed = true;
      controllerInput?.removeEventListener(onMidiEvent);
    },
  };
}
