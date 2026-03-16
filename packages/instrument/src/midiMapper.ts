import {
  MidiMappingMode,
  ModuleType,
  type IMidiMapperProps,
  type MidiMapping,
} from "@blibliki/engine";
import { TRACK_PAGE_BLOCKS } from "./defaults";
import type {
  InstrumentCompileResult,
  ModuleBinding,
  SlotConfig,
  TrackConfig,
} from "./types";

export const INSTRUMENT_CONTROLLER_NAME = "LCXL3 DAW";
export const INSTRUMENT_MIDI_IN_ID = "instrument-midi-in";
export const INSTRUMENT_MIDI_MAPPER_ID = "instrument-midi-mapper";
export const INSTRUMENT_MIDI_OUT_ID = "instrument-midi-out";

export const INSTRUMENT_GLOBAL_ENCODERS = [13, 14, 15, 16, 17, 18, 19, 20];
export const INSTRUMENT_UPPER_ENCODERS = [21, 22, 23, 24, 25, 26, 27, 28];
export const INSTRUMENT_LOWER_ENCODERS = [29, 30, 31, 32, 33, 34, 35, 36];
export const INSTRUMENT_FADERS = [5, 6, 7, 8, 9, 10, 11, 12];

type InstrumentMapperSource = Pick<
  InstrumentCompileResult,
  "document" | "bindings"
>;

const namespacedTrackTarget = (trackIndex: number, target: string) =>
  target.replace(/^track\./, `track.${trackIndex}.`);

const isSimpleModuleBinding = (
  binding: InstrumentCompileResult["bindings"][string] | undefined,
): binding is ModuleBinding => {
  if (binding?.kind !== "module") return false;
  if (binding.targets.length !== 1) return false;
  return binding.targets[0]?.transform === undefined;
};

const slotToMidiMapping = ({
  slot,
  cc,
  bindingKey,
  bindings,
}: {
  slot: SlotConfig;
  cc: number;
  bindingKey: string;
  bindings: InstrumentMapperSource["bindings"];
}): MidiMapping<ModuleType> | null => {
  if (!slot.active || !slot.target) return null;

  const binding = bindings[bindingKey];
  if (!isSimpleModuleBinding(binding)) return null;

  const target = binding.targets[0]!;
  return {
    cc,
    moduleId: target.moduleId,
    moduleType: target.moduleType,
    propName: target.propName,
    mode: MidiMappingMode.direct,
  };
};

const buildTrackPageMappings = ({
  bindings,
  track,
  trackIndex,
  activePage,
}: {
  bindings: InstrumentMapperSource["bindings"];
  track: TrackConfig;
  trackIndex: number;
  activePage: number;
}): MidiMapping<ModuleType>[] => {
  const [upperBlock, lowerBlock] = TRACK_PAGE_BLOCKS[activePage]!;
  const mappings: MidiMapping<ModuleType>[] = [];

  track.pages[upperBlock].forEach((slot, index) => {
    const bindingKey = namespacedTrackTarget(trackIndex, slot.target ?? "");
    const mapping = slotToMidiMapping({
      slot,
      cc: INSTRUMENT_UPPER_ENCODERS[index]!,
      bindingKey,
      bindings,
    });
    if (mapping) mappings.push(mapping);
  });

  track.pages[lowerBlock].forEach((slot, index) => {
    const bindingKey = namespacedTrackTarget(trackIndex, slot.target ?? "");
    const mapping = slotToMidiMapping({
      slot,
      cc: INSTRUMENT_LOWER_ENCODERS[index]!,
      bindingKey,
      bindings,
    });
    if (mapping) mappings.push(mapping);
  });

  return mappings;
};

const buildGlobalMappings = (
  source: InstrumentMapperSource,
): MidiMapping<ModuleType>[] => {
  const mappings: MidiMapping<ModuleType>[] = [];

  source.document.globalBlock.slots.forEach((slot, index) => {
    const bindingKey = slot.target ?? "";
    const mapping = slotToMidiMapping({
      slot,
      cc: INSTRUMENT_GLOBAL_ENCODERS[index]!,
      bindingKey,
      bindings: source.bindings,
    });
    if (mapping) mappings.push(mapping);
  });

  source.document.tracks.forEach((_track, index) => {
    mappings.push({
      cc: INSTRUMENT_FADERS[index]!,
      moduleId: `track-${index + 1}-final-gain`,
      moduleType: ModuleType.Gain,
      propName: "gain",
      mode: MidiMappingMode.direct,
    });
  });

  return mappings;
};

export const buildInstrumentMidiMapperProps = (
  source: InstrumentMapperSource,
  activePage: number,
  activeTrack: number,
): IMidiMapperProps => ({
  activeTrack,
  globalMappings: buildGlobalMappings(source),
  tracks: source.document.tracks.map((track, trackIndex) => ({
    name: track.name
      ? `Track ${trackIndex + 1}: ${track.name}`
      : `Track ${trackIndex + 1}`,
    mappings: buildTrackPageMappings({
      bindings: source.bindings,
      track,
      trackIndex,
      activePage,
    }),
  })),
});
