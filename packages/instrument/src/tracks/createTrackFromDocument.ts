import type { InstrumentTrackDocument } from "@/document/types";
import Track from "./Track";

export function createTrackFromDocument(
  trackDocument: InstrumentTrackDocument,
  defaultVoices = 8,
) {
  return new Track(trackDocument.key, {
    voices: trackDocument.voices ?? defaultVoices,
    midiChannel: trackDocument.midiChannel,
    sourceProfileId: trackDocument.sourceProfileId,
    fxChain: trackDocument.fxChain,
  });
}
