import type { InstrumentRecipe } from "./InstrumentRecipe";
import { createRecipeDocument } from "./recipeDocument";

export const drumKitRecipe: InstrumentRecipe = {
  id: "drum-kit",
  title: "Drum kit",
  description: "One drum machine with a four on the floor pattern.",
  document: createRecipeDocument("Drum kit", [
    {
      name: "Drums",
      sourceProfileId: "drumMachine",
      fxChain: ["compressor", "none", "none", "none"],
      lanes: {
        C3: "x...x...x...x...",
        D3: "....x.......x...",
        "F#3": "..x...x...x...x.",
        "A#3": "...............x",
      },
    },
  ]),
};
