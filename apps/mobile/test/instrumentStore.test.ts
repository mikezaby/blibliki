import { createDefaultInstrumentDocument } from "@blibliki/instrument";
import type { IInstrument } from "@blibliki/models";
import { describe, expect, it } from "vitest";
import {
  clearInstrumentDraft,
  loadInstrumentDraft,
  resolveInstrumentDocument,
  saveInstrumentDraft,
} from "../src/instrumentStore";

function createStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}

function createInstrument(id: string, name: string): IInstrument {
  return {
    id,
    name,
    userId: "user-1",
    document: { ...createDefaultInstrumentDocument(), name },
  };
}

describe("instrumentStore", () => {
  it("keeps a separate draft per instrument", () => {
    const storage = createStorage();
    const one = createInstrument("one", "One");
    const two = createInstrument("two", "Two");

    saveInstrumentDraft(storage, one.id, {
      ...createDefaultInstrumentDocument(),
      name: "One edited",
    });

    expect(loadInstrumentDraft(storage, one.id)?.name).toBe("One edited");
    expect(loadInstrumentDraft(storage, two.id)).toBeUndefined();
  });

  it("opens the device draft in preference to the stored instrument", () => {
    const storage = createStorage();
    const instrument = createInstrument("one", "Stored name");

    expect(resolveInstrumentDocument(storage, instrument).name).toBe(
      "Stored name",
    );

    saveInstrumentDraft(storage, instrument.id, {
      ...createDefaultInstrumentDocument(),
      name: "Draft name",
    });

    expect(resolveInstrumentDocument(storage, instrument).name).toBe(
      "Draft name",
    );
  });

  it("falls back to the stored instrument once the draft is discarded", () => {
    const storage = createStorage();
    const instrument = createInstrument("one", "Stored name");

    saveInstrumentDraft(storage, instrument.id, {
      ...createDefaultInstrumentDocument(),
      name: "Draft name",
    });
    clearInstrumentDraft(storage, instrument.id);

    expect(loadInstrumentDraft(storage, instrument.id)).toBeUndefined();
    expect(resolveInstrumentDocument(storage, instrument).name).toBe(
      "Stored name",
    );
  });

  it("ignores a draft that no longer parses rather than failing to open", () => {
    const storage = createStorage({
      "blibliki.instrument.one": "{not json",
    });
    const instrument = createInstrument("one", "Stored name");

    expect(resolveInstrumentDocument(storage, instrument).name).toBe(
      "Stored name",
    );
  });
});
