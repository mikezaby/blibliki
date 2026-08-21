import {
  migrateInstrumentDocument,
  type InstrumentDocument,
} from "@blibliki/instrument";
import type { IInstrument } from "@blibliki/models";

type DeviceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const DRAFT_KEY_PREFIX = "blibliki.instrument.";

function draftKey(instrumentId: string) {
  return `${DRAFT_KEY_PREFIX}${instrumentId}`;
}

function readDocument(value: unknown) {
  // Migrating on read is what lets a draft written by an older build, or an
  // instrument stored before the current version, still open.
  return migrateInstrumentDocument(
    value as Parameters<typeof migrateInstrumentDocument>[0],
  );
}

// The device keeps a draft per instrument, so edits survive closing the app
// without writing back to the shared instrument in Firestore.
export function loadInstrumentDraft(
  storage: DeviceStorage,
  instrumentId: string,
): InstrumentDocument | undefined {
  const stored = storage.getItem(draftKey(instrumentId));
  if (!stored) {
    return undefined;
  }

  try {
    return readDocument(JSON.parse(stored));
  } catch {
    // A draft that no longer parses is not worth refusing to open the
    // instrument over; the stored version takes its place.
    return undefined;
  }
}

export function saveInstrumentDraft(
  storage: DeviceStorage,
  instrumentId: string,
  document: InstrumentDocument,
) {
  storage.setItem(draftKey(instrumentId), JSON.stringify(document));
}

// Discarding is what makes the stored instrument authoritative again, so the
// draft has to go rather than just being reloaded.
export function clearInstrumentDraft(
  storage: DeviceStorage,
  instrumentId: string,
) {
  storage.removeItem(draftKey(instrumentId));
}

// What the console opens on: the device's draft when there is one, otherwise
// the instrument as stored.
export function resolveInstrumentDocument(
  storage: DeviceStorage,
  instrument: IInstrument,
): InstrumentDocument {
  return (
    loadInstrumentDraft(storage, instrument.id) ??
    readDocument(instrument.document)
  );
}
