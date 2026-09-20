import type { InstrumentDocument } from "@/document/types";

export type InstrumentRecipe = {
  id: string;
  title: string;
  description: string;
  document: InstrumentDocument;
};
