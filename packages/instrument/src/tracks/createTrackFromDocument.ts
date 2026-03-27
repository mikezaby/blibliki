import type { InstrumentTrackDocument } from "@/document/types";
import Track from "./Track";

export function createTrackFromDocument(
  trackDocument: InstrumentTrackDocument,
  voices = 8,
) {
  return new Track(trackDocument.key, {
    voices,
    midiChannel: trackDocument.midiChannel,
    sourceProfileId: trackDocument.sourceProfileId,
    fxChain: trackDocument.fxChain,
  });
}
