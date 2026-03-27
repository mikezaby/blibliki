import { Instrument } from "@blibliki/models";
import { createDefaultInstrumentDocument } from "@/instruments/document";

export function createNewInstrumentForUser(userId: string): Instrument {
  const document = createDefaultInstrumentDocument();

  return new Instrument({
    userId,
    name: document.name,
    document,
  });
}
