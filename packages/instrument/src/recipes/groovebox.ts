import type { InstrumentRecipe } from "./InstrumentRecipe";
import { createRecipeDocument } from "./recipeDocument";

export const grooveboxRecipe: InstrumentRecipe = {
  id: "groovebox",
  title: "Groovebox",
  description: "Drums, bass and a lead, all sequenced. Press play and it runs.",
  document: createRecipeDocument("Groovebox", [
    {
      name: "Drums",
      sourceProfileId: "drumMachine",
      fxChain: ["compressor", "none", "none", "none"],
      lanes: {
        C3: "x...x...x...x...",
        D3: "....x.......x...",
        "F#3": "x.x.x.x.x.x.x.x.",
        "A#3": "......x.......x.",
      },
    },
    {
      name: "Bass",
      sourceProfileId: "osc",
      voices: 1,
      fxChain: ["none", "none", "none", "none"],
      controllerSlotValues: {
        "amp.decay": 0.2,
        "amp.sustain": 0.3,
        "amp.release": 0.08,
        "filter.cutoff": 900,
      },
      lanes: {
        C2: "x..x......x.....",
        G1: "......x.......x.",
        "A#1": "............x...",
      },
    },
    {
      name: "Lead",
      sourceProfileId: "threeOsc",
      fxChain: ["none", "chorus", "delay", "reverb"],
      controllerSlotValues: {
        "amp.release": 0.3,
      },
      lanes: {
        C4: "x.........x.....",
        "D#4": "...x............",
        G4: "......x.......x.",
        "A#3": "............x...",
      },
    },
  ]),
};
