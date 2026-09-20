import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentRecipe } from "./InstrumentRecipe";

export const blankRecipe: InstrumentRecipe = {
  id: "blank",
  title: "Blank",
  description: "Seven empty tracks and a master. Pick every source yourself.",
  document: { ...createDefaultInstrumentDocument(), name: "Blank" },
};
