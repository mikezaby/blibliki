import type { InstrumentRecipe } from "./InstrumentRecipe";
import { createRecipeDocument } from "./recipeDocument";

export const polySynthRecipe: InstrumentRecipe = {
  id: "poly-synth",
  title: "Poly synth",
  description: "One eight voice synth to play from a keyboard.",
  document: createRecipeDocument("Poly synth", [
    {
      name: "Synth",
      sourceProfileId: "threeOsc",
      voices: 8,
      fxChain: ["none", "chorus", "none", "reverb"],
      controllerSlotValues: {
        "amp.release": 0.4,
      },
    },
  ]),
};
