import {
  createDefaultInstrumentDocument,
  migrateInstrumentDocument,
  type InstrumentDocument,
} from "@blibliki/instrument";

const STORAGE_KEY = "blibliki.instrument";

export function loadInstrumentDocument(
  storage: Pick<Storage, "getItem" | "setItem">,
): InstrumentDocument {
  const stored = storage.getItem(STORAGE_KEY);
  if (!stored) {
    return createDefaultInstrumentDocument();
  }

  try {
    // Migrating on read is what lets a document saved by an older build still
    // open after an app update.
    return migrateInstrumentDocument(
      JSON.parse(stored) as Parameters<typeof migrateInstrumentDocument>[0],
    );
  } catch {
    // A stored document that no longer parses is not worth refusing to boot
    // over — the default at least gets an instrument on screen.
    return createDefaultInstrumentDocument();
  }
}

export function saveInstrumentDocument(
  storage: Pick<Storage, "getItem" | "setItem">,
  document: InstrumentDocument,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(document));
}
