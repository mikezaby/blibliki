import type { BPM, IEngineSerialize, TimeSignature } from "@blibliki/engine";
import type {
  EffectProfileId,
  InstrumentGlobalBlock,
  InstrumentNoteSource,
  SourceProfileId,
} from "@/document/types";
import type { TrackPageKey } from "@/types";
import type { CompiledMidiMapperProps } from "./types";
import type { MidiPortSelection } from "./types";
import type { CompiledTrack } from "./types";

export type CompiledInstrumentTrack = {
  key: string;
  name: string;
  midiChannel: number;
  noteSource: InstrumentNoteSource;
  sourceProfileId: SourceProfileId;
  fxChain: [EffectProfileId, EffectProfileId, EffectProfileId, EffectProfileId];
  compiledTrack: CompiledTrack;
};

export type CompileInstrumentOptions = {
  trackVoices?: number;
};

export type CompiledInstrumentLaunchControlXL3PageSummary = {
  trackKey: string;
  trackName: string;
  midiChannel: number;
  controllerPage: 1 | 2 | 3;
  trackIndex: number;
  pageKey: TrackPageKey;
};

export type InstrumentRuntimeMode = "performance" | "seqEdit";

export type InstrumentNavigationState = {
  activeTrackIndex: number;
  activePage: TrackPageKey;
  mode: InstrumentRuntimeMode;
  shiftPressed: boolean;
  sequencerPageIndex: number;
  selectedStepIndex: number;
};

export type CompiledInstrument = {
  version: string;
  name: string;
  templateId: string;
  hardwareProfileId: string;
  globalBlock: InstrumentGlobalBlock;
  tracks: CompiledInstrumentTrack[];
  launchControlXL3: {
    pages: CompiledInstrumentLaunchControlXL3PageSummary[];
  };
};

export type CompiledInstrumentMidiMapperProps = Pick<
  CompiledMidiMapperProps,
  "tracks" | "activeTrack" | "globalMappings"
>;

export type CreateInstrumentEnginePatchOptions = {
  bpm?: BPM;
  timeSignature?: TimeSignature;
  trackVoices?: number;
  noteInput?: MidiPortSelection | false;
  controllerInput?: MidiPortSelection | false;
  controllerOutput?: MidiPortSelection | false;
  midiMapper?: {
    id?: string;
    name?: string;
    activeTrack?: number;
    globalMappings?: CompiledInstrumentMidiMapperProps["globalMappings"];
  };
  navigation?: Partial<InstrumentNavigationState>;
  master?:
    | {
        id?: string;
        name?: string;
      }
    | false;
};

export type CompiledInstrumentEnginePatch = {
  compiledInstrument: CompiledInstrument;
  patch: IEngineSerialize;
  runtime: {
    masterId?: string;
    transportControlId: string;
    masterFilterId: string;
    globalDelayId: string;
    globalReverbId: string;
    masterVolumeId: string;
    midiMapperId: string;
    noteInputId?: string;
    controllerInputId?: string;
    controllerOutputId?: string;
    navigation: InstrumentNavigationState;
    stepSequencerIds: Record<string, string>;
  };
};
