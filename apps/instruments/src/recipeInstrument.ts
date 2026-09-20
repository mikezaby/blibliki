import type { InstrumentRecipe } from "@blibliki/instrument";
import type { IInstrument } from "@blibliki/models";

const RECIPE_ID_PREFIX = "recipe.";

type FindRecipe = (recipeId: string) => InstrumentRecipe | undefined;

export function recipeInstrumentId(recipeId: string) {
  return `${RECIPE_ID_PREFIX}${recipeId}`;
}

export function isRecipeInstrumentId(instrumentId: string) {
  return instrumentId.startsWith(RECIPE_ID_PREFIX);
}

export function recipeIdOf(instrumentId: string) {
  return instrumentId.slice(RECIPE_ID_PREFIX.length);
}

// A recipe opens in the console like any instrument, but it comes from the
// package and belongs to nobody, so edits to it only ever reach a device draft.
export function findRecipeInstrument(
  instrumentId: string,
  findRecipe: FindRecipe,
): IInstrument | undefined {
  const recipe = findRecipe(recipeIdOf(instrumentId));
  if (!isRecipeInstrumentId(instrumentId) || !recipe) {
    return undefined;
  }

  return {
    id: instrumentId,
    name: recipe.title,
    userId: "",
    document: recipe.document,
  };
}

export async function loadInstrument(
  instrumentId: string,
  findRemote: (instrumentId: string) => Promise<IInstrument>,
): Promise<IInstrument> {
  if (!isRecipeInstrumentId(instrumentId)) {
    return findRemote(instrumentId);
  }

  // Imported here and not at the top: a route loader reaches this file, the
  // server evaluates loaders while prerendering, and the instrument package
  // pulls in the audio build that reads `window` as it loads.
  const { findInstrumentRecipe } = await import("@blibliki/instrument");
  const recipeInstrument = findRecipeInstrument(
    instrumentId,
    findInstrumentRecipe,
  );
  if (!recipeInstrument) {
    throw Error(`Instrument ${instrumentId} not found`);
  }

  return recipeInstrument;
}
