import {
  Engine,
  MidiEventType,
  PlaybackMode,
  Resolution,
  TransportState,
  controllerMatchers,
  type ControllerMatcherDefinition,
  type IPage,
  type IStep,
  type MidiEvent,
  type MidiOutputDevice,
  ModuleType,
} from "@blibliki/engine";
import {
  TRACK_PAGE_BLOCKS,
  type InstrumentControlValue,
  type InstrumentCompileResult,
  type SessionControlSpec,
  type StepPageConfig,
  type SlotConfig,
} from "@blibliki/instrument";
import { DisplayBridge } from "./DisplayBridge.js";
import type { PiDisplayCell, PiDisplayState } from "./PiDisplayState.js";
import { PiLaunchControlXL3 } from "./PiLaunchControlXL3.js";

const SHIFT = 63;
const PAGE_PREV = 106;
const PAGE_NEXT = 107;
const TRACK_PREV = 103;
const TRACK_NEXT = 102;

const ENCODER_ROW_GLOBAL = [13, 14, 15, 16, 17, 18, 19, 20];
const ENCODER_ROW_UPPER = [21, 22, 23, 24, 25, 26, 27, 28];
const ENCODER_ROW_LOWER = [29, 30, 31, 32, 33, 34, 35, 36];
const FADERS = [5, 6, 7, 8, 9, 10, 11, 12];
const STEP_BUTTONS = [
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
];

const STEP_OFF_COLOR = 4;
const STEP_ON_COLOR = 60;
const STEP_SELECTED_COLOR = 5;
const STEP_PLAYHEAD_COLOR = 120;

type SessionState = {
  activeTrack: number;
  activePage: number;
  shiftHeld: boolean;
  seqEdit: boolean;
  selectedSeqPage: number;
  selectedStep: number;
  sessionValues: Record<string, InstrumentControlValue>;
};

const sessionRegistry = new Map<string, PiSession>();
let piMatcherInstalled = false;

const isLaunchControlMatcher = (matcher: ControllerMatcherDefinition) =>
  matcher.id === "launch-control-xl3-daw";

export function installPiControllerMatcher() {
  if (piMatcherInstalled) return;
  const matcherIndex = controllerMatchers.findIndex(isLaunchControlMatcher);
  const matcher: ControllerMatcherDefinition = {
    id: "launch-control-xl3-daw",
    klass: PiLaunchControlXL3,
    inputCandidateNames: [
      "LCXL3 DAW",
      "LCXL3 DAW In",
      "Launch Control XL 3 DAW",
      "Launch Control XL3 DAW",
    ],
    outputCandidateNames: [
      "LCXL3 DAW",
      "LCXL3 DAW Out",
      "Launch Control XL 3 DAW",
      "Launch Control XL3 DAW",
    ],
    minScore: 0.6,
    maxInstances: 1,
  };

  if (matcherIndex >= 0) {
    controllerMatchers.splice(matcherIndex, 1, matcher);
  } else {
    controllerMatchers.push(matcher);
  }

  piMatcherInstalled = true;
}

export function getPiSessionByEngineId(engineId: string) {
  return sessionRegistry.get(engineId);
}

export class PiSession {
  private readonly engineId: string;
  private readonly engine: Engine;
  private readonly compiled: InstrumentCompileResult;
  private readonly display: DisplayBridge;
  private output: MidiOutputDevice | null = null;
  private readonly state: SessionState;

  constructor(engine: Engine, compiled: InstrumentCompileResult) {
    this.engine = engine;
    this.engineId = engine.id;
    this.compiled = compiled;
    this.display = new DisplayBridge();
    this.state = {
      activeTrack: 0,
      activePage: 0,
      shiftHeld: false,
      seqEdit: false,
      selectedSeqPage: 0,
      selectedStep: 0,
      sessionValues: {},
    };

    sessionRegistry.set(this.engineId, this);
    installPiControllerMatcher();
    this.hydrateSessionValues();
  }

  start() {
    this.display.start();
    this.engine.onPropsUpdate(() => {
      this.pushDisplayState();
      this.refreshStepLights();
    });
    this.attachExternalMidiInputs();
    this.pushDisplayState();
    this.refreshStepLights();
  }

  dispose() {
    sessionRegistry.delete(this.engineId);
    this.display.dispose();
  }

  attachControllerOutput(output: MidiOutputDevice) {
    this.output = output;
    this.refreshStepLights();
  }

  toggleTransport() {
    if (this.engine.state === TransportState.playing) {
      this.engine.stop();
    } else {
      void this.engine.start();
    }

    this.pushDisplayState();
  }

  handleControllerEvent(cc: number, value: number) {
    if (cc === SHIFT) {
      this.state.shiftHeld = value > 0;
      return;
    }

    if (cc === TRACK_PREV && value === 127) {
      this.state.activeTrack =
        (this.state.activeTrack + this.compiled.document.tracks.length - 1) %
        this.compiled.document.tracks.length;
      this.pushDisplayState();
      this.refreshStepLights();
      return;
    }

    if (cc === TRACK_NEXT && value === 127) {
      this.state.activeTrack =
        (this.state.activeTrack + 1) % this.compiled.document.tracks.length;
      this.pushDisplayState();
      this.refreshStepLights();
      return;
    }

    if (cc === PAGE_NEXT && value === 127 && this.state.shiftHeld) {
      this.state.seqEdit = !this.state.seqEdit;
      this.pushDisplayState();
      this.refreshStepLights();
      return;
    }

    if (cc === PAGE_PREV && value === 127) {
      if (this.state.seqEdit) {
        this.state.selectedSeqPage = (this.state.selectedSeqPage + 3) % 4;
      } else {
        this.state.activePage = (this.state.activePage + 2) % 3;
      }
      this.pushDisplayState();
      this.refreshStepLights();
      return;
    }

    if (cc === PAGE_NEXT && value === 127) {
      if (this.state.seqEdit) {
        this.state.selectedSeqPage = (this.state.selectedSeqPage + 1) % 4;
      } else {
        this.state.activePage = (this.state.activePage + 1) % 3;
      }
      this.pushDisplayState();
      this.refreshStepLights();
      return;
    }

    const faderIndex = FADERS.indexOf(cc);
    if (faderIndex >= 0) {
      this.setTrackFinalGain(faderIndex, midiToRange(value, 0, 1));
      this.pushDisplayState();
      return;
    }

    if (this.state.seqEdit) {
      const stepIndex = STEP_BUTTONS.indexOf(cc);
      if (stepIndex >= 0 && value === 127) {
        this.state.selectedStep = stepIndex;
        this.pushDisplayState();
        this.refreshStepLights();
        return;
      }

      this.applySeqEditEncoder(cc, value);
      return;
    }

    this.applyPerformanceEncoder(cc, value);
  }

  private hydrateSessionValues() {
    this.compiled.document.globalBlock.slots.forEach((slot) => {
      this.storeSessionValue(slot);
    });

    this.compiled.document.tracks.forEach((track, trackIndex) => {
      Object.values(track.pages).forEach((page) => {
        page.forEach((slot) => {
          this.storeSessionValue(slot, trackIndex);
        });
      });
    });
  }

  private storeSessionValue(slot: SlotConfig, trackIndex?: number) {
    if (!slot.target) return;
    const bindingKey =
      trackIndex === undefined
        ? slot.target
        : slot.target.replace(/^track\./, `track.${trackIndex}.`);
    const binding = this.compiled.bindings[bindingKey];
    if (binding?.kind !== "session") return;

    this.state.sessionValues[binding.sessionKey] = slot.initialValue ?? null;
  }

  private attachExternalMidiInputs() {
    const inputDevices = Array.from(
      this.engine.midiDeviceManager.inputDevices.values(),
    );
    inputDevices.forEach((device) => {
      if ("name" in device && isControllerInputName(device.name)) return;
      if (!("addEventListener" in device)) return;

      device.addEventListener((event: MidiEvent) => {
        if (
          event.type !== MidiEventType.noteOn &&
          event.type !== MidiEventType.noteOff
        ) {
          return;
        }

        const channel = (event.channel ?? 0) + 1;
        this.compiled.document.tracks.forEach((track, trackIndex) => {
          if (
            track.noteSource !== "externalMidi" ||
            track.midiChannel !== channel
          ) {
            return;
          }

          const noteSourceModuleId =
            this.compiled.tracks[trackIndex]?.noteSourceModuleId;
          if (!noteSourceModuleId) return;

          const module = this.engine.findModule(noteSourceModuleId);
          if (module.moduleType !== ModuleType.VirtualMidi) return;

          module.sendMidi(event);
        });
      });
    });
  }

  private applyPerformanceEncoder(cc: number, value: number) {
    const globalIndex = ENCODER_ROW_GLOBAL.indexOf(cc);
    if (globalIndex >= 0) {
      const slot = this.compiled.document.globalBlock.slots[globalIndex];
      if (!slot) return;
      this.applySlot(slot, value);
      return;
    }

    const [upperBlock, lowerBlock] = TRACK_PAGE_BLOCKS[this.state.activePage]!;
    const track = this.compiled.document.tracks[this.state.activeTrack]!;
    const upperIndex = ENCODER_ROW_UPPER.indexOf(cc);
    if (upperIndex >= 0) {
      this.applySlot(
        track.pages[upperBlock][upperIndex]!,
        value,
        this.state.activeTrack,
      );
      return;
    }

    const lowerIndex = ENCODER_ROW_LOWER.indexOf(cc);
    if (lowerIndex >= 0) {
      this.applySlot(
        track.pages[lowerBlock][lowerIndex]!,
        value,
        this.state.activeTrack,
      );
      return;
    }
  }

  private applySeqEditEncoder(cc: number, value: number) {
    const track = this.compiled.document.tracks[this.state.activeTrack]!;
    if (!track.stepSequencer) return;

    const page = track.stepSequencer.pages[this.state.selectedSeqPage]!;
    const step = page.steps[this.state.selectedStep]!;

    const topIndex = ENCODER_ROW_GLOBAL.indexOf(cc);
    if (topIndex >= 0) {
      switch (topIndex) {
        case 0:
          step.active = value >= 64;
          break;
        case 1:
          step.probability = Math.round(midiToRange(value, 0, 100));
          break;
        case 2:
          step.duration = midiToStepDuration(value);
          break;
        case 3:
          step.microtimeOffset = Math.round(midiToRange(value, -100, 100));
          break;
        case 4:
          track.stepSequencer.resolution = midiToResolution(value);
          break;
        case 5:
          track.stepSequencer.playbackMode =
            value >= 64 ? PlaybackMode.oneShot : PlaybackMode.loop;
          break;
        case 7:
          track.stepSequencer.loopLength = Math.max(
            1,
            Math.round(midiToRange(value, 1, 4)),
          );
          break;
      }
      this.refreshTrackStepSequencer(this.state.activeTrack);
      this.pushDisplayState();
      this.refreshStepLights();
      return;
    }

    const velocityIndex = ENCODER_ROW_UPPER.indexOf(cc);
    if (velocityIndex >= 0) {
      const note = step.notes[velocityIndex];
      if (!note) return;

      note.velocity = Math.max(1, Math.round(midiToRange(value, 1, 127)));
      this.refreshTrackStepSequencer(this.state.activeTrack);
      this.pushDisplayState();
      return;
    }

    const pitchIndex = ENCODER_ROW_LOWER.indexOf(cc);
    if (pitchIndex >= 0) {
      const note = step.notes[pitchIndex];
      if (!note) return;

      note.pitch = midiToPitch(value);
      this.refreshTrackStepSequencer(this.state.activeTrack);
      this.pushDisplayState();
    }
  }

  private refreshTrackStepSequencer(trackIndex: number) {
    const moduleId = this.compiled.tracks[trackIndex]?.noteSourceModuleId;
    if (!moduleId) return;
    const module = this.engine.findModule(moduleId);
    if (module.moduleType !== ModuleType.StepSequencer) return;

    const stepSequencer =
      this.compiled.document.tracks[trackIndex]!.stepSequencer!;
    module.props = {
      patterns: [{ name: "A", pages: toEnginePages(stepSequencer.pages) }],
      resolution: stepSequencer.resolution,
      playbackMode: stepSequencer.playbackMode,
    };
    module.triggerPropsUpdate();
  }

  private setTrackFinalGain(trackIndex: number, gain: number) {
    const module = this.engine.findModule(`track-${trackIndex + 1}-final-gain`);
    if (module.moduleType !== ModuleType.Gain) return;
    module.props = { gain };
    module.triggerPropsUpdate();
  }

  private applySlot(slot: SlotConfig, midiValue: number, trackIndex?: number) {
    if (!slot.active || !slot.target) return;

    const bindingKey =
      trackIndex === undefined
        ? slot.target
        : slot.target.replace(/^track\./, `track.${trackIndex}.`);
    const binding = this.compiled.bindings[bindingKey];
    if (!binding) return;

    const nextValue = controlValueFromMidi(binding.control, midiValue);

    switch (binding.kind) {
      case "transport":
        if (binding.transportProp === "bpm" && typeof nextValue === "number") {
          this.engine.bpm = nextValue;
        }
        if (
          binding.transportProp === "swingAmount" &&
          typeof nextValue === "number"
        ) {
          this.engine.transport.swingAmount = nextValue;
        }
        break;
      case "session":
        this.state.sessionValues[binding.sessionKey] = nextValue;
        break;
      case "module":
        binding.targets.forEach((target) => {
          const module = this.engine.findModule(target.moduleId);
          const transformedValue = applyTransform(nextValue, target.transform);
          module.props = { [target.propName]: transformedValue };
          module.triggerPropsUpdate();
        });
        break;
    }

    slot.initialValue = nextValue;
    this.pushDisplayState();
  }

  private pushDisplayState() {
    this.display.push(this.buildDisplayState());
  }

  private buildDisplayState(): PiDisplayState {
    const document = this.compiled.document;
    const track = document.tracks[this.state.activeTrack]!;
    const [upperBlock, lowerBlock] = TRACK_PAGE_BLOCKS[this.state.activePage]!;

    return {
      header: {
        patchName: document.name,
        trackName: track.name
          ? `Track ${this.state.activeTrack + 1}: ${track.name}`
          : `Track ${this.state.activeTrack + 1}`,
        pageName: ["Src/Amp", "Flt/Mod", "FX A/B"][this.state.activePage]!,
        transport:
          this.engine.state === TransportState.playing ? "PLAY" : "STOP",
      },
      globals: document.globalBlock.slots.map((slot) => this.toCell(slot)),
      upper: {
        title: upperBlock.toUpperCase(),
        cells: track.pages[upperBlock].map((slot) =>
          this.toCell(slot, this.state.activeTrack),
        ),
      },
      lower: {
        title: lowerBlock.toUpperCase(),
        cells: track.pages[lowerBlock].map((slot) =>
          this.toCell(slot, this.state.activeTrack),
        ),
      },
      ...(this.state.seqEdit
        ? {
            seqEdit: {
              page: this.state.selectedSeqPage + 1,
              step: this.currentStepNo(),
              selected: this.state.selectedStep + 1,
            },
          }
        : {}),
    };
  }

  private toCell(slot: SlotConfig, trackIndex?: number): PiDisplayCell {
    return {
      label: slot.displayLabel ?? slot.label,
      value: this.formatSlotValue(slot, trackIndex),
      active: slot.active,
    };
  }

  private formatSlotValue(slot: SlotConfig, trackIndex?: number): string {
    if (!slot.active) return "---";
    if (!slot.target) return formatValue(slot.initialValue);

    const bindingKey =
      trackIndex === undefined
        ? slot.target
        : slot.target.replace(/^track\./, `track.${trackIndex}.`);
    const binding = this.compiled.bindings[bindingKey];
    if (!binding) return formatValue(slot.initialValue);

    switch (binding.kind) {
      case "transport":
        if (binding.transportProp === "bpm") {
          return `${this.engine.bpm}`;
        }
        return `${Math.round(this.engine.transport.swingAmount * 100)}%`;
      case "session":
        return formatValue(
          this.state.sessionValues[binding.sessionKey] ?? slot.initialValue,
        );
      case "module": {
        const firstTarget = binding.targets[0];
        if (!firstTarget) return formatValue(slot.initialValue);
        const module = this.engine.findModule(firstTarget.moduleId);
        const props = module.props as Record<string, InstrumentControlValue>;
        return formatValue(props[firstTarget.propName] ?? slot.initialValue);
      }
    }
  }

  private currentStepNo() {
    const noteSourceModuleId =
      this.compiled.tracks[this.state.activeTrack]?.noteSourceModuleId;
    if (!noteSourceModuleId) return this.state.selectedStep + 1;
    const module = this.engine.findModule(noteSourceModuleId);
    if (module.moduleType !== ModuleType.StepSequencer)
      return this.state.selectedStep + 1;

    const state = module.state as { currentStep?: number };
    return (state.currentStep ?? this.state.selectedStep) + 1;
  }

  private refreshStepLights() {
    if (!this.output) return;

    STEP_BUTTONS.forEach((cc, index) => {
      let color = STEP_OFF_COLOR;
      const track = this.compiled.document.tracks[this.state.activeTrack];
      const currentPage =
        track?.stepSequencer?.pages[this.state.selectedSeqPage];
      const currentStep = currentPage?.steps[index];

      if (currentStep?.active) color = STEP_ON_COLOR;
      if (index === this.state.selectedStep) color = STEP_SELECTED_COLOR;
      if (index + 1 === this.currentStepNo()) color = STEP_PLAYHEAD_COLOR;
      if (!this.state.seqEdit) color = STEP_OFF_COLOR;

      this.output?.directSend([176, cc, color]);
    });
  }
}

const isControllerInputName = (name: string) =>
  name.includes("LCXL3") || name.includes("Launch Control");

const midiToRange = (value: number, min: number, max: number) =>
  min + (value / 127) * (max - min);

const controlValueFromMidi = (
  control: SessionControlSpec,
  midiValue: number,
): InstrumentControlValue => {
  switch (control.kind) {
    case "boolean":
      return midiValue >= 64;
    case "enum": {
      const index = Math.min(
        control.options.length - 1,
        Math.floor((midiValue / 127) * control.options.length),
      );
      return control.options[index]!;
    }
    case "number": {
      const min = control.min ?? 0;
      const max = control.max ?? 1;
      const normalized = midiValue / 127;
      const curved = control.exp
        ? Math.pow(normalized, control.exp)
        : normalized;
      const rawValue = min + curved * (max - min);
      if (control.step) {
        const steps = Math.round((rawValue - min) / control.step);
        return min + steps * control.step;
      }
      return rawValue;
    }
  }
};

const applyTransform = (
  value: InstrumentControlValue,
  transform?: { type: string } & Record<string, unknown>,
) => {
  if (!transform || transform.type === "identity") return value;
  if (transform.type === "linear" && typeof value === "number") {
    return value * (transform.scale as number) + (transform.offset as number);
  }
  if (transform.type === "enumMap") {
    return (transform.map as Record<string, InstrumentControlValue>)[
      String(value)
    ];
  }
  if (transform.type === "booleanMap") {
    return value ? transform.trueValue : transform.falseValue;
  }
  return value;
};

const formatValue = (value: InstrumentControlValue | undefined) => {
  if (value === undefined || value === null || value === "") return "---";
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "ON" : "OFF";
  }
  return value;
};

const midiToPitch = (value: number) => {
  if (value <= 3) return null;
  const midiNote = Math.round(midiToRange(value, 36, 84));
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(midiNote / 12) - 1;
  const name = noteNames[midiNote % 12]!;
  return `${name}${octave}`;
};

const midiToStepDuration = (value: number): IStep["duration"] => {
  const values: IStep["duration"][] = ["1/16", "1/8", "1/4", "1/2", "1"];
  return values[
    Math.min(values.length - 1, Math.floor((value / 127) * values.length))
  ]!;
};

const midiToResolution = (value: number): Resolution => {
  const values = [Resolution.sixteenth, Resolution.eighth, Resolution.quarter];
  return values[
    Math.min(values.length - 1, Math.floor((value / 127) * values.length))
  ]!;
};

const toEnginePages = (pages: StepPageConfig[]): IPage[] => {
  return pages.map((page: StepPageConfig) => ({
    name: page.name,
    steps: page.steps.map(
      (step): IStep => ({
        active: step.active,
        probability: step.probability,
        microtimeOffset: step.microtimeOffset,
        duration: step.duration,
        ccMessages: [],
        notes: step.notes.flatMap((note) =>
          note.pitch
            ? [
                {
                  note: note.pitch,
                  velocity: note.velocity,
                },
              ]
            : [],
        ),
      }),
    ),
  }));
};
