import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import { isMasterTrackDocument } from "@/document/masterTrack";
import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
import { writeStepLanes, type StepLanes } from "./stepLanes";

export type RecipeTrack = Partial<InstrumentTrackDocument> & {
  // A track with lanes gets a step sequencer with the lanes on its first page.
  lanes?: StepLanes;
};

// Starts from the default document so a recipe only states what differs.
// Note tracks the recipe does not mention are switched off, not removed: the
// template fixes the track count.
export function createRecipeDocument(
  name: string,
  recipeTracks: RecipeTrack[],
): InstrumentDocument {
  const document = createDefaultInstrumentDocument();

  return {
    ...document,
    name,
    tracks: document.tracks.map((track, trackIndex) => {
      if (isMasterTrackDocument(track)) {
        return track;
      }

      const recipeTrack = recipeTracks[trackIndex];
      if (!recipeTrack) {
        return { ...track, enabled: false };
      }

      const { lanes, ...changes } = recipeTrack;
      const [firstPage, ...otherPages] = track.sequencer.pages;
      if (!lanes || !firstPage) {
        return { ...track, ...changes };
      }

      return {
        ...track,
        noteSource: "stepSequencer",
        ...changes,
        sequencer: {
          ...track.sequencer,
          pages: [writeStepLanes(firstPage, lanes), ...otherPages],
        },
      };
    }),
  };
}
