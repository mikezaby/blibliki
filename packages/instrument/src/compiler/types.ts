import type {
  BPM,
  IEngineSerialize,
  IMidiMapperProps,
  IRoute,
  TimeSignature,
} from "@blibliki/engine";
import type { BlockModule } from "@/blocks/types";
import type { PageKind, PageRegionPosition } from "@/pages/Page";
import type { AnySlotBinding, SlotInitialValue } from "@/slots/BaseSlot";
import type {
  BlockKey,
  Fixed2,
  Fixed8,
  TrackPageKey,
  ValueSpec,
} from "@/types";

export type CompiledPageSlot =
  | {
      kind: "empty";
    }
  | {
      kind: "slot";
      blockKey: BlockKey;
      blockType: string;
      slotKey: string;
      label: string;
      shortLabel: string;
      valueSpec: ValueSpec;
      binding: AnySlotBinding;
      initialValue?: SlotInitialValue;
      inactive?: boolean;
    };

export type CompiledPageRegion = {
  position: PageRegionPosition;
  slots: Fixed8<CompiledPageSlot>;
};

export type CompiledPage = {
  key: TrackPageKey;
  kind: PageKind;
  regions: Fixed2<CompiledPageRegion>;
};

type LaunchControlXL3SlotMeta = {
  cc: number;
  controllerRow: PageRegionPosition;
  controllerColumn: number;
};

export type CompiledLaunchControlXL3PageSlot =
  | ({
      kind: "empty";
    } & LaunchControlXL3SlotMeta)
  | ({
      kind: "slot";
      blockKey: BlockKey;
      blockType: string;
      slotKey: string;
      label: string;
      shortLabel: string;
      valueSpec: ValueSpec;
      binding: AnySlotBinding;
      initialValue?: SlotInitialValue;
      inactive?: boolean;
    } & LaunchControlXL3SlotMeta);

export type CompiledLaunchControlXL3Page = {
  controllerPage: 1 | 2 | 3;
  midiMapperTrackIndex: number;
  pageKey: TrackPageKey;
  regions: Fixed2<{
    position: PageRegionPosition;
    slots: Fixed8<CompiledLaunchControlXL3PageSlot>;
  }>;
};

export type CompiledLaunchControlXL3PageSummary = Pick<
  CompiledLaunchControlXL3Page,
  "controllerPage" | "midiMapperTrackIndex" | "pageKey"
>;

export type CompiledMidiMapperProps = Pick<
  IMidiMapperProps,
  "tracks" | "activeTrack" | "globalMappings"
>;

export type CompiledTrack = {
  key: string;
  engine: {
    modules: BlockModule[];
    routes: IRoute[];
  };
  pages: CompiledPage[];
  launchControlXL3: {
    pages: CompiledLaunchControlXL3PageSummary[];
    resolvedPages: CompiledLaunchControlXL3Page[];
    midiMapper: CompiledMidiMapperProps;
  };
};

export type MidiPortSelection = {
  selectedId?: string | null;
  selectedName?: string | null;
  allIns?: boolean;
  excludedIds?: string[];
  excludedNames?: string[];
};

export type CreateTrackEnginePatchOptions = {
  bpm?: BPM;
  timeSignature?: TimeSignature;
  noteInput?: MidiPortSelection | false;
  controllerInput?: MidiPortSelection | false;
  controllerOutput?: MidiPortSelection | false;
  midiMapper?: {
    id?: string;
    name?: string;
    activeTrack?: number;
    globalMappings?: CompiledMidiMapperProps["globalMappings"];
  };
  master?:
    | {
        id?: string;
        name?: string;
      }
    | false;
};

export type CompiledTrackEnginePatch = {
  compiledTrack: CompiledTrack;
  patch: IEngineSerialize;
  runtime: {
    masterId?: string;
    midiMapperId: string;
    noteInputId?: string;
    controllerInputId?: string;
    controllerOutputId?: string;
  };
};
