import {
  type IMidiMapperProps,
  type IUpdateModule,
  ModuleType,
  type MidiEvent,
  TransportState,
} from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
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
  onRuntimePatchChange?: (runtimePatch: CompiledInstrumentEnginePatch) => void;
  onDisplayStateChange?: (displayState: InstrumentDisplayState) => void;
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
) {
  return createLiveInstrumentDisplayState(engine, runtimePatch);
}

export function createInstrumentControllerSession(
  engine: InstrumentControllerEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  options: CreateInstrumentControllerSessionOptions = {},
): InstrumentControllerSession {
  let currentRuntimePatch = runtimePatch;
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
    options.onRuntimePatchChange?.(currentRuntimePatch);
    options.onDisplayStateChange?.(
      createDisplayState(engine, currentRuntimePatch),
    );
  };

  engine.onPropsUpdate?.(() => {
    emitState();
  });
  engine.transport?.addPropertyChangeCallback?.("state", () => {
    emitState();
  });

  const handleMidiEvent = (event: MidiEvent) => {
    const result = reduceInstrumentControllerEvent(currentRuntimePatch, event);
    let didRuntimePatchChange = result.runtimePatch !== currentRuntimePatch;
    currentRuntimePatch = result.runtimePatch;

    if (result.command.type === "navigation") {
      engine.updateModule(createMidiMapperUpdate(currentRuntimePatch));
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
    getDisplayState: () => createDisplayState(engine, currentRuntimePatch),
    dispose: () => {
      disposed = true;
      controllerInput?.removeEventListener(onMidiEvent);
    },
  };
}
