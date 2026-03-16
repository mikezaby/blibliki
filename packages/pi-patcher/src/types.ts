import type {
  IEngineSerialize,
  ModuleType,
  NumberProp,
  EnumProp,
  BooleanProp,
  Resolution,
  PlaybackMode,
} from "@blibliki/engine";
import type { Division } from "@blibliki/transport";

export const PI_PATCHER_VERSION = "0.1.0";
export const PI_TEMPLATE_ID = "pi-8-track-v1";
export const PI_HARDWARE_PROFILE_ID = "launch-control-xl3-v1";
export const PI_TRACK_COUNT = 8;
export const PI_GLOBAL_SLOT_COUNT = 8;
export const PI_PAGE_SLOT_COUNT = 8;
export const PI_STEP_PAGE_COUNT = 4;
export const PI_STEP_COUNT = 16;
export const PI_STEP_NOTE_COUNT = 8;

export type PiControlValue = number | string | boolean | null;

export type PageBlockId = "source" | "amp" | "filter" | "mod" | "fxA" | "fxB";
export type TrackNoteSource = "stepSequencer" | "externalMidi";
export type SourceProfileId = "unassigned" | "osc" | "3-osc" | "noise" | "wavetable";
export type EffectType = "reverb" | "delay" | "chorus" | "distortion";

export type SlotConfig = {
  slotId: string;
  active: boolean;
  label: string;
  displayLabel?: string;
  target?: string;
  initialValue?: PiControlValue;
};

export type EffectSlotConfig = {
  slotId: string;
  effectType: EffectType | null;
};

export type StepNoteConfig = {
  pitch: string | null;
  velocity: number;
};

export type StepConfig = {
  active: boolean;
  probability: number;
  duration: Division;
  microtimeOffset: number;
  notes: StepNoteConfig[];
};

export type StepPageConfig = {
  name: string;
  steps: StepConfig[];
};

export type StepSequencerConfig = {
  pages: StepPageConfig[];
  loopLength: number;
  resolution: Resolution;
  playbackMode: PlaybackMode;
};

export type TrackPages = {
  source: SlotConfig[];
  amp: SlotConfig[];
  filter: SlotConfig[];
  mod: SlotConfig[];
  fxA: SlotConfig[];
  fxB: SlotConfig[];
};

export type TrackConfig = {
  name?: string;
  noteSource: TrackNoteSource;
  midiChannel: number;
  sourceProfileId: SourceProfileId;
  effectSlots: EffectSlotConfig[];
  pages: TrackPages;
  stepSequencer?: StepSequencerConfig;
};

export type GlobalBlock = {
  slots: SlotConfig[];
};

export type PiPatcherDocument = {
  version: string;
  name: string;
  templateId: string;
  hardwareProfileId: string;
  globalBlock: GlobalBlock;
  tracks: TrackConfig[];
};

export type NumberControlSpec = NumberProp & { kind: "number" };
export type EnumControlSpec = EnumProp<string | number> & { kind: "enum" };
export type BooleanControlSpec = BooleanProp & { kind: "boolean" };

export type SessionControlSpec =
  | NumberControlSpec
  | EnumControlSpec
  | BooleanControlSpec;

export type BindingTransform =
  | { type: "identity" }
  | { type: "linear"; scale: number; offset: number }
  | { type: "enumMap"; map: Record<string, PiControlValue> }
  | { type: "booleanMap"; trueValue: PiControlValue; falseValue: PiControlValue };

export type ModuleBindingTarget = {
  moduleId: string;
  moduleType: ModuleType;
  propName: string;
  transform?: BindingTransform;
};

export type ModuleBinding = {
  kind: "module";
  control: SessionControlSpec;
  targets: ModuleBindingTarget[];
};

export type TransportBinding = {
  kind: "transport";
  control: SessionControlSpec;
  transportProp: "bpm" | "swingAmount";
};

export type SessionBinding = {
  kind: "session";
  control: SessionControlSpec;
  sessionKey: string;
};

export type ResolvedBinding = ModuleBinding | TransportBinding | SessionBinding;

export type TrackRuntimeMetadata = {
  noteSourceModuleId: string;
  sourceProfileId: SourceProfileId;
  effectSlots: EffectSlotConfig[];
};

export type PiPatcherCompileResult = {
  document: PiPatcherDocument;
  engine: IEngineSerialize;
  bindings: Record<string, ResolvedBinding>;
  tracks: TrackRuntimeMetadata[];
};
