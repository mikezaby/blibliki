import type { IInstrument } from "@blibliki/models";
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

export function cloneInstrumentForUser(
  source: IInstrument,
  userId: string,
): Instrument {
  return new Instrument({
    userId,
    name: `${source.name} (Clone)`,
    document: structuredClone(source.document),
  });
}
