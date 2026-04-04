import type {
  EffectProfileId,
  InstrumentDocument,
  InstrumentTrackControllerSlotValues,
  InstrumentSequencerStep,
  InstrumentTrackDocument,
} from "@/instruments/document";

export function cloneInstrumentDocument(
  document: InstrumentDocument,
): InstrumentDocument {
  return structuredClone(document);
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

export function updateSequencerStep(
  document: InstrumentDocument,
  trackIndex: number,
  pageIndex: number,
  stepIndex: number,
  step: InstrumentSequencerStep,
): InstrumentDocument {
  const next = cloneInstrumentDocument(document);
  const track = next.tracks[trackIndex];
  const page = track?.sequencer.pages[pageIndex];
  if (!track || !page) {
    return next;
  }

  const nextPages = [...track.sequencer.pages];
  const nextSteps = [...page.steps];
  nextSteps[stepIndex] = step;
  nextPages[pageIndex] = {
    ...page,
    steps: nextSteps,
  };

  next.tracks[trackIndex] = {
    ...track,
    sequencer: {
      ...track.sequencer,
      pages: nextPages,
    },
  };

  return next;
}
