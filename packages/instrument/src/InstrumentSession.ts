import {
  type IUpdateModule,
  MidiEvent,
  MidiEventType,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import { Instrument } from "@/Instrument";
import {
  createMidiMapperUpdate,
  getSelectedMidiName,
} from "@/InstrumentSessionMidi";
import {
  type InstrumentPersistenceAction,
  InstrumentSessionPersistenceFlow,
} from "@/InstrumentSessionPersistence";
import type {
  CompiledInstrumentEnginePatch,
  InstrumentNavigationState,
} from "@/compiler/instrumentTypes";
import type {
  InstrumentDisplayNotice,
  InstrumentDisplayState,
} from "@/display/InstrumentDisplayState";
import {
  createLiveInstrumentDisplayState,
  type LiveDisplayEngine,
} from "@/display/LiveInstrumentDisplayState";
import {
  cancelOverlayEvents,
  cheatsheetDisplayEvents,
  disableAnalogAutoDisplayEvents,
  encoderDisplayEvents,
  navigationDisplayEvents,
} from "@/hardware/launchControlXL3/LaunchControlXL3HardwareDisplay";
import {
  clearStep,
  liveRecordLapSteps,
  type LiveRecordTarget,
  liveRecordTarget,
  positionTicks,
  recordLiveNote,
  setLiveNoteDuration,
} from "@/sequencer/liveRecord";
import {
  DEFAULT_MIDI_RECORDING_SETTINGS,
  type MidiRecordingSettings,
} from "@/sequencer/recordingSettings";
import {
  getActiveStepSequencerId,
  getStepSequencerProps,
  type StepEntryUpdate,
  STEPS_PER_PAGE,
} from "@/sequencer/stepEntry";
import { syncLaunchControlXL3NavigationButtonLeds } from "@/surfaces/launchControlXL3/LaunchControlXL3NavigationLeds";
import { launchControlXL3SequencerEdit } from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerEdit";
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
  start: (actionAt?: number) => Promise<void> | void;
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

type EngineSessionRecorder = {
  sessionRecorderId?: string;
};

// A MIDI output can be observed without a route; `listen` returns the
// unsubscribe. Audio IOs have no `listen`.
type EngineIOLookup = {
  findIO?: (
    moduleId: string,
    ioName: string,
    type: "input" | "output",
  ) => {
    name: string;
    listen?: (listener: (event: MidiEvent) => void) => () => void;
  };
};

export type InstrumentControllerEngine = MidiInputLookup &
  EngineModuleUpdater &
  EngineTransportController &
  EnginePropsObserver &
  EngineStateObserver &
  EngineSessionRecorder &
  EngineIOLookup &
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
  sendControlEvent: (event: MidiEvent) => void;
  setRecordingSettings: (settings: MidiRecordingSettings) => void;
  dispose: () => void;
};

// A real-time recording in progress: which passes over the loop it takes,
// which steps this pass has written (replace mode keeps a chord together),
// and the notes still held, for their length.
type LiveRecordRun = {
  fromLap: number;
  toLap: number;
  passLap?: number;
  writtenSteps: Set<string>;
  pendingNotes: Map<string, { target: LiveRecordTarget; ticks: number }>;
};

// Steps a sequencer has advanced since the transport started, counted from
// its step updates so no page arithmetic depends on when its page prop moves.
type Playhead = {
  absolute: number;
  lastStep: number;
};

function withNavigation(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: Partial<InstrumentNavigationState>,
) {
  return Instrument.fromRuntimePatch(runtimePatch)
    .withNavigation(navigation)
    .serializeEnginePatch();
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

// The note input's outgoing MIDI, so played notes reach the surface on the
// same path as controller events. A missing module or output means no tap.
function tapNoteInput(
  engine: EngineIOLookup,
  noteInputId: string | undefined,
  listener: (event: MidiEvent) => void,
): (() => void) | undefined {
  if (!noteInputId) {
    return;
  }

  try {
    return engine
      .findIO?.(noteInputId, "midi out", "output")
      .listen?.(listener);
  } catch {
    return;
  }
}

export class InstrumentSession implements InstrumentControllerSession {
  private currentRuntimePatch: CompiledInstrumentEnginePatch;
  private currentNotice: InstrumentDisplayNotice | undefined;
  private disposed = false;
  private readonly controllerInput: ControllerInputDevice | undefined;
  private readonly stopNoteTap: (() => void) | undefined;
  private readonly persistenceFlow: InstrumentSessionPersistenceFlow;
  private recordingSettings = DEFAULT_MIDI_RECORDING_SETTINGS;
  private liveRun: LiveRecordRun | undefined;
  private readonly playheads = new Map<string, Playhead>();

  constructor(
    private readonly engine: InstrumentControllerEngine,
    runtimePatch: CompiledInstrumentEnginePatch,
    private readonly options: CreateInstrumentControllerSessionOptions = {},
  ) {
    this.currentRuntimePatch = runtimePatch;
    this.currentNotice = options.initialDisplayNotice;

    // Designate this instrument's recorder so the controller's Record button
    // (engine.toggleSessionRecording) records the full instrument mix.
    engine.sessionRecorderId = runtimePatch.runtime.sessionRecorderId;
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
    // Stopping the transport ends a recording, as it does on the hardware
    // this copies.
    engine.transport?.addPropertyChangeCallback?.("state", (state) => {
      if (state !== TransportState.playing) {
        this.playheads.clear();
        this.setLiveRecord(false);
      }
      this.emitState();
    });
    engine.onStateUpdate?.(this.onEngineStateUpdate);

    this.controllerInput?.addEventListener(this.onMidiEvent);
    this.stopNoteTap = tapNoteInput(
      engine,
      runtimePatch.runtime.noteInputId,
      this.onMidiEvent,
    );
    this.sendHardwareDisplayEvents(disableAnalogAutoDisplayEvents());
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

  // Plays a synthesized controller event down the exact path a physical Launch
  // Control XL3 event takes, so on-screen controls need no parallel input path.
  // The engine's MidiInput module goes first because the display code below
  // relies on the mapper having already updated props, which is the order the
  // hardware listeners are registered in.
  sendControlEvent(event: MidiEvent) {
    if (this.disposed) {
      return;
    }

    const { controllerInputId } = this.currentRuntimePatch.runtime;
    if (controllerInputId) {
      this.engine.findModule(controllerInputId).sendMidi?.(event);
    }

    this.handleMidiEvent(event);
  }

  setRecordingSettings(settings: MidiRecordingSettings) {
    this.recordingSettings = settings;
    this.applyMetronome();
  }

  // The click follows the metronome setting, or only a running live record
  // when the performer asked for that.
  private applyMetronome() {
    const { metronome, metronomeOnlyWhileRecording } = this.recordingSettings;
    this.engine.updateModule({
      id: this.currentRuntimePatch.runtime.metronomeId,
      moduleType: ModuleType.Metronome,
      changes: {
        props: {
          enabled:
            metronome &&
            (!metronomeOnlyWhileRecording || this.liveRun !== undefined),
        },
      },
    });
  }

  dispose() {
    this.disposed = true;
    this.engine.removeStateUpdateCallback?.(this.onEngineStateUpdate);
    this.controllerInput?.removeEventListener(this.onMidiEvent);
    this.stopNoteTap?.();
  }

  private findLiveModule(id: string) {
    try {
      return this.engine.findModule(id);
    } catch {
      return undefined;
    }
  }

  private applyEdit(edit: StepEntryUpdate | null): boolean {
    if (!edit) {
      return false;
    }

    this.currentRuntimePatch = edit.runtimePatch;
    if (edit.update) {
      this.engine.updateModule(edit.update);
    }

    return true;
  }

  private activeLap(stepSequencerId: string) {
    const stepSequencer = getStepSequencerProps(this.currentRuntimePatch);
    const playhead = this.playheads.get(stepSequencerId);
    if (!stepSequencer || !playhead) {
      return 0;
    }

    return Math.floor(
      playhead.absolute / liveRecordLapSteps(stepSequencer.props),
    );
  }

  // Arming while the transport runs records from now in loop mode and from
  // the next pass in one-shot mode; arming while stopped starts the
  // transport, after a bar of clicks when the pre-count is on.
  private setLiveRecord(enabled: boolean) {
    const { navigation } = this.currentRuntimePatch.runtime;
    if (!enabled) {
      const wasRecording = this.liveRun !== undefined;
      this.liveRun = undefined;
      if (navigation.liveRecord) {
        this.currentRuntimePatch = withNavigation(this.currentRuntimePatch, {
          liveRecord: undefined,
        });
      }
      if (wasRecording && this.recordingSettings.metronomeOnlyWhileRecording) {
        this.applyMetronome();
      }
      return;
    }

    const stepSequencerId = getActiveStepSequencerId(this.currentRuntimePatch);
    if (!stepSequencerId) {
      return;
    }

    const playing = this.engine.state === TransportState.playing;
    const oneShot = this.recordingSettings.mode === "oneShot";
    const lap = playing ? this.activeLap(stepSequencerId) : 0;
    const fromLap = playing && oneShot ? lap + 1 : lap;
    this.liveRun = {
      fromLap,
      toLap: oneShot ? fromLap : Infinity,
      writtenSteps: new Set(),
      pendingNotes: new Map(),
    };
    if (this.recordingSettings.metronomeOnlyWhileRecording) {
      this.applyMetronome();
    }

    if (!playing) {
      const startAt = this.recordingSettings.precount
        ? this.findLiveModule(
            this.currentRuntimePatch.runtime.metronomeId,
          )?.countIn?.(1)
        : undefined;
      void this.engine.start(startAt);
    }
  }

  private recordLiveEvent(event: MidiEvent): boolean {
    const run = this.liveRun;
    const note = event.note;
    const runtimePatch = this.currentRuntimePatch;
    const { navigation } = runtimePatch.runtime;
    const activeTrack =
      runtimePatch.compiledInstrument.tracks[navigation.activeTrackIndex];
    const stepSequencerId = getActiveStepSequencerId(runtimePatch);
    const stepSequencer = getStepSequencerProps(runtimePatch);
    if (
      !run ||
      !note ||
      !activeTrack ||
      !stepSequencerId ||
      !stepSequencer ||
      event.channel !== activeTrack.midiChannel - 1
    ) {
      return false;
    }

    const position = this.findLiveModule(stepSequencerId)?.positionAt?.(
      event.triggeredAt,
    );
    if (!position) {
      return false;
    }

    const name = note.fullName;
    const velocity = Math.round(note.velocity * 127);
    const ticks = positionTicks(position);

    if (event.type === MidiEventType.noteOn && velocity > 0) {
      const target = liveRecordTarget(
        stepSequencer.props,
        position,
        this.recordingSettings.quantize,
      );
      if (target.lap < run.fromLap || target.lap > run.toLap) {
        return false;
      }
      if (run.passLap !== target.lap) {
        run.passLap = target.lap;
        run.writtenSteps.clear();
      }

      const key = `${target.pageIndex}:${target.stepIndex}`;
      const edit = recordLiveNote(
        runtimePatch,
        target,
        { note: name, velocity },
        this.recordingSettings.overdub,
        run.writtenSteps.has(key),
      );
      run.writtenSteps.add(key);
      run.pendingNotes.set(name, { target, ticks });

      return this.applyEdit(edit);
    }

    const pending = run.pendingNotes.get(name);
    if (!pending) {
      return false;
    }
    run.pendingNotes.delete(name);

    return this.applyEdit(
      setLiveNoteDuration(runtimePatch, pending.target, ticks - pending.ticks),
    );
  }

  private trackPlayhead(id: string, currentStep: number) {
    const playhead = this.playheads.get(id);
    const advance =
      playhead === undefined
        ? 0
        : (currentStep - playhead.lastStep + STEPS_PER_PAGE) % STEPS_PER_PAGE;
    const absolute = (playhead?.absolute ?? 0) + advance;
    this.playheads.set(id, { absolute, lastStep: currentStep });

    return absolute;
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

  private sendHardwareDisplayEvents(events: MidiEvent[] | null) {
    if (!events) return;
    const { controllerOutputId } = this.currentRuntimePatch.runtime;
    if (!controllerOutputId) return;
    const midiOut = this.engine.findModule(controllerOutputId);
    if (!midiOut.onMidiEvent) return;
    for (const event of events) {
      midiOut.onMidiEvent(event);
    }
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

    if (event.cc === SHIFT_CC) {
      this.sendHardwareDisplayEvents(
        event.ccValue === 127
          ? cheatsheetDisplayEvents(this.getDisplayState())
          : cancelOverlayEvents(),
      );
    }

    if (result.command.type === "persistence") {
      void this.persistenceFlow.requestAction(
        result.command.action,
        this.currentRuntimePatch,
      );
      return;
    }

    if (result.command.type === "macro") {
      for (const adjustment of result.command.adjustments) {
        // Read the live base (dedicated-encoder value) and add the macro's
        // offset delta on top, so the two layers compose without clobbering.
        const live = this.engine.findModule(adjustment.moduleId).props?.[
          adjustment.propKey
        ];
        const base = typeof live === "number" ? live : 0;
        const next = Math.max(
          adjustment.clampMin,
          Math.min(adjustment.clampMax, base + adjustment.delta),
        );
        this.engine.updateModule({
          id: adjustment.moduleId,
          moduleType: adjustment.moduleType,
          changes: { props: { [adjustment.propKey]: next } },
        });
      }
      this.sendHardwareDisplayEvents(
        encoderDisplayEvents(this.getDisplayState(), result.command.cc),
      );
    }

    if (
      result.command.type === "seqEdit.toggle" ||
      result.command.type === "seqEdit.page"
    ) {
      const sequencerPageSync = launchControlXL3SequencerEdit.createPageSync(
        this.currentRuntimePatch,
      );
      if (sequencerPageSync?.update) {
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

    if (result.command.type === "navigation") {
      this.sendHardwareDisplayEvents(
        navigationDisplayEvents(this.getDisplayState()),
      );
    }

    if (
      result.command.type === "none" &&
      !didRuntimePatchChange &&
      this.currentRuntimePatch.runtime.navigation.mode === "performance" &&
      event.isCC &&
      event.cc !== undefined &&
      event.ccValue !== 127
    ) {
      const cc = event.cc;
      // queueMicrotask ensures the engine has processed the CC and updated props
      // before we read display state (engine's listener fires before ours)
      queueMicrotask(() => {
        if (this.disposed) return;
        this.sendHardwareDisplayEvents(
          encoderDisplayEvents(this.getDisplayState(), cc),
        );
      });
    }

    if (result.command.type === "seqEdit.update") {
      if (result.command.update) {
        this.engine.updateModule(result.command.update);
      }
      if (result.command.cc !== undefined) {
        this.sendHardwareDisplayEvents(
          encoderDisplayEvents(this.getDisplayState(), result.command.cc),
        );
      }
    }

    if (result.command.type === "liveRecord.toggle") {
      this.setLiveRecord(result.command.enabled);
    }

    if (event.isNote && this.liveRun && this.recordLiveEvent(event)) {
      didRuntimePatchChange = true;
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

    if (params.moduleType !== ModuleType.StepSequencer) {
      return;
    }

    const state = params.state as { currentStep?: unknown } | undefined;
    const currentStep =
      typeof state?.currentStep === "number" ? state.currentStep : undefined;
    const playing = this.engine.state === TransportState.playing;
    const absolute =
      currentStep !== undefined && playing
        ? this.trackPlayhead(params.id, currentStep)
        : undefined;

    if (params.id !== getActiveStepSequencerId(this.currentRuntimePatch)) {
      return;
    }

    const run = this.liveRun;
    const stepSequencer = getStepSequencerProps(this.currentRuntimePatch);
    if (run && stepSequencer && absolute !== undefined) {
      const lapSteps = liveRecordLapSteps(stepSequencer.props);
      if (Math.floor(absolute / lapSteps) > run.toLap) {
        // One-shot: the pass is over.
        this.setLiveRecord(false);
        this.emitState();
      } else if (
        this.currentRuntimePatch.runtime.navigation.liveRecord?.erasing
      ) {
        const stepInLap = absolute % lapSteps;
        const erased = this.applyEdit(
          clearStep(
            this.currentRuntimePatch,
            Math.floor(stepInLap / STEPS_PER_PAGE),
            stepInLap % STEPS_PER_PAGE,
          ),
        );
        if (erased) {
          this.emitState();
        }
      }
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
