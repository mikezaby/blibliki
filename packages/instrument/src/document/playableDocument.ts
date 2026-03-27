import { createDefaultInstrumentDocument } from "./defaultDocument";
import type { InstrumentDocument } from "./types";

export function createDefaultPlayableInstrumentDocument(): InstrumentDocument {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error(
      "Default instrument document must include at least one track",
    );
  }

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
  };

  return document;
}
