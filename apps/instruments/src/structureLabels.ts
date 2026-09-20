import {
  isMasterTrackDocument,
  type EffectProfileId,
  type InstrumentDocument,
  type InstrumentTrackDocument,
  type SourceProfileId,
} from "@blibliki/instrument";

export const SOURCE_LABELS: Record<SourceProfileId, string> = {
  unassigned: "No source",
  osc: "Oscillator",
  wavetable: "Wavetable",
  noise: "Noise",
  threeOsc: "Three osc",
  drumMachine: "Drum machine",
};

export const EFFECT_LABELS: Record<EffectProfileId, string> = {
  none: "None",
  distortion: "Distortion",
  compressor: "Compressor",
  chorus: "Chorus",
  delay: "Delay",
  reverb: "Reverb",
};

export function trackLabel(document: InstrumentDocument, trackIndex: number) {
  const track = document.tracks[trackIndex];
  const name = track?.name?.trim();
  if (name) {
    return name;
  }

  return `Track ${String(trackIndex + 1)}`;
}

function effectsSummary(track: InstrumentTrackDocument) {
  const effects = track.fxChain
    .filter((effect) => effect !== "none")
    .map((effect) => EFFECT_LABELS[effect]);

  return effects.length > 0 ? effects.join(" → ") : "No effects";
}

export function summarizeTrack(
  document: InstrumentDocument,
  trackIndex: number,
) {
  const track = document.tracks[trackIndex];
  if (!track) {
    return "";
  }

  if (isMasterTrackDocument(track)) {
    return effectsSummary(track);
  }

  if (track.enabled === false) {
    return "Off";
  }

  const sequencer = track.noteSource === "stepSequencer" ? ["sequencer"] : [];

  if (track.audioSource?.type === "track") {
    const feederKey = track.audioSource.trackKey;
    const feederIndex = document.tracks.findIndex(
      (candidate) => candidate.key === feederKey,
    );

    return [
      `Fed from ${trackLabel(document, feederIndex)}`,
      ...sequencer,
      effectsSummary(track),
    ].join(" · ");
  }

  return [
    SOURCE_LABELS[track.sourceProfileId],
    ...sequencer,
    `ch ${String(track.midiChannel)}`,
    effectsSummary(track),
  ].join(" · ");
}

export function soundingTrackLabels(document: InstrumentDocument) {
  return document.tracks.flatMap((track, trackIndex) =>
    !isMasterTrackDocument(track) &&
    track.enabled !== false &&
    track.sourceProfileId !== "unassigned"
      ? [trackLabel(document, trackIndex)]
      : [],
  );
}

export function summarizeDocument(document: InstrumentDocument) {
  const sounding = soundingTrackLabels(document);
  const noteTrackCount = document.tracks.filter(
    (track) => !isMasterTrackDocument(track),
  ).length;

  return sounding.length > 0
    ? sounding.join(" · ")
    : `${String(noteTrackCount)} empty tracks`;
}
