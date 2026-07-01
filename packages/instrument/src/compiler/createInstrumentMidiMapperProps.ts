import { MidiMappingMode, ModuleType } from "@blibliki/engine";
import { countNoteTracks } from "@/compiler/instrumentRuntimeState";
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

  const trackMappings = track.compiledTrack.launchControlXL3.midiMapper.tracks;
  const pageMappings =
    trackMappings.find((candidate) => candidate.name === activePage) ??
    trackMappings[0];

  if (!pageMappings) {
    throw new Error(`No midi mappings found in compiled track ${track.key}`);
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
    Math.min(
      navigation.activeTrackIndex,
      countNoteTracks(compiledInstrument.tracks) - 1,
    ),
  );

  const props = {
    // The master track is not part of the performance track cycle. It is always
    // compiled last, so filtering it keeps note-track indices aligned.
    tracks: compiledInstrument.tracks
      .filter((track) => track.audioSource.type !== "master")
      .map((track, trackIndex) => ({
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
  // The master track has its own Main Volume encoder, so it is excluded from
  // the per-note-track fader row (CC 5-12).
  return compiledInstrument.tracks
    .filter((track) => track.audioSource.type !== "master")
    .map((track, trackIndex) => ({
      cc: FADER_CCS[trackIndex],
      moduleId: `${track.key}.trackGain.main`,
      moduleType: ModuleType.Volume,
      propName: "volume",
      mode: MidiMappingMode.direct,
    }));
}

export function createInstrumentEncoderGlobalMappings(
  runtimeIds: InstrumentGlobalMappingRuntimeIds,
  masterTrackKey: string,
  stepSequencerIds: Record<string, string> = {},
) {
  return launchControlXL3GlobalRow.flatMap((control) => {
    switch (control.key) {
      case null:
        return [];
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
      case "masterVolume":
        return {
          cc: control.cc,
          moduleId: `${masterTrackKey}.trackGain.main`,
          moduleType: ModuleType.Volume,
          propName: "volume",
          mode: MidiMappingMode.incDec,
        };
      case "probabilityAmount":
        return Object.values(stepSequencerIds).map((moduleId) => ({
          cc: control.cc,
          moduleId,
          moduleType: ModuleType.StepSequencer,
          propName: "probabilityAmount",
          mode: MidiMappingMode.incDec,
        }));
      default:
        control.key satisfies never;
        return [];
    }
  });
}
