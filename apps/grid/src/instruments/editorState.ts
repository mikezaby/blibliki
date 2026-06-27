import type {
  EffectProfileId,
  InstrumentDocument,
  InstrumentGlobalBlock,
  InstrumentTrackControllerSlotValues,
  InstrumentTrackDocument,
} from "@/instruments/document";

export function cloneInstrumentDocument(
  document: InstrumentDocument,
): InstrumentDocument {
  return structuredClone(document);
}

export function updateGlobalBlock(
  document: InstrumentDocument,
  key: keyof InstrumentGlobalBlock,
  value: number,
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);
  next.globalBlock[key] = value;
  return next;
}

export function updateTrackDocument(
  document: InstrumentDocument,
  trackIndex: number,
  changes: Partial<InstrumentTrackDocument>,
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);
  const track = next.tracks[trackIndex];
  if (!track) {
    return next;
  }

  next.tracks[trackIndex] = {
    ...track,
    ...changes,
  };

  return next;
}

export function selectTrackAudioSource(
  document: InstrumentDocument,
  trackIndex: number,
  sourceTrackKey: string | undefined,
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);
  const track = next.tracks[trackIndex];
  if (!track) {
    return next;
  }

  track.audioSource = sourceTrackKey
    ? {
        type: "track",
        trackKey: sourceTrackKey,
        mode:
          track.audioSource?.type === "track"
            ? track.audioSource.mode
            : "parallel",
      }
    : { type: "internal" };

  return next;
}

export function updateTrackFxChain(
  document: InstrumentDocument,
  trackIndex: number,
  fxIndex: 0 | 1 | 2 | 3,
  effectProfileId: EffectProfileId,
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);
  const track = next.tracks[trackIndex];
  if (!track) {
    return next;
  }

  const fxChain = [...track.fxChain] as InstrumentTrackDocument["fxChain"];
  fxChain[fxIndex] = effectProfileId;
  next.tracks[trackIndex] = {
    ...track,
    fxChain,
  };

  return next;
}

export function updateTrackControllerSlotValue(
  document: InstrumentDocument,
  trackIndex: number,
  slotKey: string,
  value: InstrumentTrackControllerSlotValues[string],
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);
  const track = next.tracks[trackIndex];
  if (!track) {
    return next;
  }

  next.tracks[trackIndex] = {
    ...track,
    controllerSlotValues: {
      ...(track.controllerSlotValues ?? {}),
      [slotKey]: value,
    },
  };

  return next;
}
