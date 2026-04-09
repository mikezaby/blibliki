import { MidiMappingMode, ModuleType } from "@blibliki/engine";
import { launchControlXL3GlobalRow } from "@/hardware/launchControlXL3/globalRow";
import type { TrackPageKey } from "@/types";
import type {
  CompiledInstrument,
  CompiledInstrumentMidiMapperProps,
  InstrumentNavigationState,
} from "./instrumentTypes";

export const DEFAULT_ACTIVE_PAGE: TrackPageKey = "sourceAmp";
const FADER_CCS = [5, 6, 7, 8, 9, 10, 11, 12] as const;
const SEQ_EDIT_CC_MIN = 13;
const SEQ_EDIT_CC_MAX = 36;

export type InstrumentGlobalMappingRuntimeIds = {
  transportControlId: string;
  masterFilterId: string;
  globalDelayId: string;
  globalReverbId: string;
  masterVolumeId: string;
};

function getTrackPageMappings(
  compiledInstrument: CompiledInstrument,
  trackIndex: number,
  activePage: TrackPageKey,
) {
  const track = compiledInstrument.tracks[trackIndex];
  if (!track) {
    throw new Error(`Track ${trackIndex} not found in compiled instrument`);
  }

  const pageMappings =
    track.compiledTrack.launchControlXL3.midiMapper.tracks.find(
      (candidate) => candidate.name === activePage,
    );

  if (!pageMappings) {
    throw new Error(
      `Page ${activePage} not found in compiled track ${track.key} midi mappings`,
    );
  }

  return pageMappings.mappings;
}

function isSeqEditOwnedCc(cc: number | undefined) {
  return cc !== undefined && cc >= SEQ_EDIT_CC_MIN && cc <= SEQ_EDIT_CC_MAX;
}

export function createInstrumentMidiMapperProps(
  compiledInstrument: CompiledInstrument,
  navigation: InstrumentNavigationState,
  globalMappings: CompiledInstrumentMidiMapperProps["globalMappings"] = [],
): CompiledInstrumentMidiMapperProps {
  const activeTrackIndex = Math.max(
    0,
    Math.min(navigation.activeTrackIndex, compiledInstrument.tracks.length - 1),
  );

  const props = {
    tracks: compiledInstrument.tracks.map((track, trackIndex) => ({
      name: track.name,
      mappings: getTrackPageMappings(
        compiledInstrument,
        trackIndex,
        navigation.activePage,
      ),
    })),
    activeTrack: activeTrackIndex,
    globalMappings,
  };

  if (navigation.mode !== "seqEdit") {
    return props;
  }

  return {
    ...props,
    tracks: props.tracks.map((track) => ({
      ...track,
      mappings: track.mappings.filter(
        (mapping) => !isSeqEditOwnedCc(mapping.cc),
      ),
    })),
    globalMappings: props.globalMappings.filter(
      (mapping) => !isSeqEditOwnedCc(mapping.cc),
    ),
  };
}

export function createInstrumentFaderGlobalMappings(
  compiledInstrument: CompiledInstrument,
) {
  return compiledInstrument.tracks.map((track, trackIndex) => ({
    cc: FADER_CCS[trackIndex],
    moduleId: `${track.key}.trackGain.main`,
    moduleType: ModuleType.Gain,
    propName: "gain",
    mode: MidiMappingMode.direct,
  }));
}

export function createInstrumentEncoderGlobalMappings(
  runtimeIds: InstrumentGlobalMappingRuntimeIds,
) {
  return launchControlXL3GlobalRow.flatMap((control) => {
    switch (control.key) {
      case "tempo":
        return {
          cc: control.cc,
          moduleId: runtimeIds.transportControlId,
          moduleType: ModuleType.TransportControl,
          propName: "bpm",
          mode: MidiMappingMode.incDec,
        };
      case "swing":
        return {
          cc: control.cc,
          moduleId: runtimeIds.transportControlId,
          moduleType: ModuleType.TransportControl,
          propName: "swing",
          mode: MidiMappingMode.incDec,
        };
      case "masterFilterCutoff":
        return {
          cc: control.cc,
          moduleId: runtimeIds.masterFilterId,
          moduleType: ModuleType.Filter,
          propName: "cutoff",
          mode: MidiMappingMode.incDec,
        };
      case "masterFilterResonance":
        return {
          cc: control.cc,
          moduleId: runtimeIds.masterFilterId,
          moduleType: ModuleType.Filter,
          propName: "Q",
          mode: MidiMappingMode.incDec,
        };
      case "reverbSend":
        return {
          cc: control.cc,
          moduleId: runtimeIds.globalReverbId,
          moduleType: ModuleType.Reverb,
          propName: "mix",
          mode: MidiMappingMode.incDec,
        };
      case "delaySend":
        return {
          cc: control.cc,
          moduleId: runtimeIds.globalDelayId,
          moduleType: ModuleType.Delay,
          propName: "mix",
          mode: MidiMappingMode.incDec,
        };
      case "masterVolume":
        return {
          cc: control.cc,
          moduleId: runtimeIds.masterVolumeId,
          moduleType: ModuleType.Gain,
          propName: "gain",
          mode: MidiMappingMode.incDec,
        };
      case "inactive":
        return [];
      default:
        control.key satisfies never;
        return [];
    }
  });
}
