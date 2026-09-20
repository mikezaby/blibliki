import {
  findInstrumentRecipe,
  updateTrackDocument,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { saveInstrumentDraft } from "../src/instrumentStore";
import {
  clearNewInstrumentDraft,
  loadNewInstrumentDraft,
  saveNewInstrumentDraft,
  startNewInstrumentDraft,
} from "../src/newInstrumentDraft";
import { recipeInstrumentId } from "../src/recipeInstrument";

function createStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}

describe("newInstrumentDraft", () => {
  it("starts on the fine-tune step with the recipe's document and title", () => {
    const draft = startNewInstrumentDraft(createStorage(), "groovebox");

    expect(draft).toMatchObject({
      step: "structure",
      recipeId: "groovebox",
      name: "Groovebox",
    });
    expect(draft?.document).toEqual(
      findInstrumentRecipe("groovebox")?.document,
    );
  });

  it("prefers what the visitor changed while trying the recipe", () => {
    const deviceStorage = createStorage();
    const recipe = findInstrumentRecipe("groovebox")!;
    const tweaked = updateTrackDocument(recipe.document, 0, { name: "Kit" });
    saveInstrumentDraft(
      deviceStorage,
      recipeInstrumentId("groovebox"),
      tweaked,
    );

    const draft = startNewInstrumentDraft(deviceStorage, "groovebox");

    expect(draft?.document.tracks[0]?.name).toBe("Kit");
  });

  it("does not start from a recipe that does not exist", () => {
    expect(startNewInstrumentDraft(createStorage(), "nope")).toBeUndefined();
  });

  it("keeps the draft across a reload until it is cleared", () => {
    const sessionStorage = createStorage();
    const draft = {
      ...startNewInstrumentDraft(createStorage(), "poly-synth")!,
      step: "name" as const,
      name: "My synth",
    };

    saveNewInstrumentDraft(sessionStorage, draft);
    expect(loadNewInstrumentDraft(sessionStorage)).toEqual(draft);

    clearNewInstrumentDraft(sessionStorage);
    expect(loadNewInstrumentDraft(sessionStorage)).toBeUndefined();
  });

  it("ignores a stored draft that no longer parses", () => {
    const sessionStorage = createStorage({
      "blibliki.newInstrument": "{not json",
    });

    expect(loadNewInstrumentDraft(sessionStorage)).toBeUndefined();
  });
});
