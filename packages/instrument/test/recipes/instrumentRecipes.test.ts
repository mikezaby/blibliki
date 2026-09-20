import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { isMasterTrackDocument } from "@/document/masterTrack";
import { CURRENT_INSTRUMENT_VERSION } from "@/document/version";
import { findInstrumentRecipe, instrumentRecipes } from "@/recipes";
import { createTrackFromDocument } from "@/tracks/createTrackFromDocument";
import type { BlockKey } from "@/types";

const playableRecipes = instrumentRecipes.filter(
  (recipe) => recipe.id !== "blank",
);

describe("instrumentRecipes", () => {
  it("gives every recipe a unique id", () => {
    const ids = instrumentRecipes.map((recipe) => recipe.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds a recipe by id and returns undefined for an unknown one", () => {
    expect(findInstrumentRecipe("groovebox")?.title).toBe("Groovebox");
    expect(findInstrumentRecipe("missing")).toBeUndefined();
  });

  it.each(instrumentRecipes)(
    "compiles $id at the current document version",
    (recipe) => {
      expect(recipe.document.version).toBe(CURRENT_INSTRUMENT_VERSION);
      expect(() => createInstrumentEnginePatch(recipe.document)).not.toThrow();
    },
  );

  it.each(playableRecipes)(
    "gives $id at least one enabled track with a real source",
    (recipe) => {
      const soundingTracks = recipe.document.tracks.filter(
        (track) =>
          track.enabled !== false &&
          !isMasterTrackDocument(track) &&
          track.sourceProfileId !== "unassigned",
      );

      expect(soundingTracks.length).toBeGreaterThan(0);
    },
  );

  it.each(instrumentRecipes)(
    "only sets slot values on slots $id actually has",
    (recipe) => {
      for (const trackDocument of recipe.document.tracks) {
        const track = createTrackFromDocument(trackDocument);

        for (const key of Object.keys(
          trackDocument.controllerSlotValues ?? {},
        )) {
          const [blockKey, slotKey] = key.split(".") as [BlockKey, string];

          expect(
            track.blocks.get(blockKey)?.slots.has(slotKey),
            `${recipe.id} ${trackDocument.key} ${key}`,
          ).toBe(true);
        }
      }
    },
  );

  it("puts a pattern on every sequencer track", () => {
    for (const recipe of playableRecipes) {
      for (const track of recipe.document.tracks) {
        if (track.noteSource !== "stepSequencer" || track.enabled === false) {
          continue;
        }

        const activeSteps = track.sequencer.pages
          .flatMap((page) => page.steps)
          .filter((step) => step.active && step.notes.length > 0);

        expect(activeSteps.length, `${recipe.id} ${track.key}`).toBeGreaterThan(
          0,
        );
      }
    }
  });
});
