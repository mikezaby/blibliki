import { migrateInstrumentDocument } from "@/document/version";
import type { InstrumentRecipe } from "./InstrumentRecipe";
import { blankRecipe } from "./blank";
import { drumKitRecipe } from "./drumKit";
import { grooveboxRecipe } from "./groovebox";
import { polySynthRecipe } from "./polySynth";

export type { InstrumentRecipe } from "./InstrumentRecipe";

// Migrating here is what keeps a recipe saved at an older document version
// usable after the version moves.
export const instrumentRecipes: InstrumentRecipe[] = [
  grooveboxRecipe,
  drumKitRecipe,
  polySynthRecipe,
  blankRecipe,
].map((recipe) => ({
  ...recipe,
  document: migrateInstrumentDocument(recipe.document),
}));

export function findInstrumentRecipe(recipeId: string) {
  return instrumentRecipes.find((recipe) => recipe.id === recipeId);
}
