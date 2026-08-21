import { createDefaultInstrumentDocument } from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import {
  loadInstrumentDocument,
  saveInstrumentDocument,
} from "../src/instrumentStore";

function createStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  };
}

describe("instrumentStore", () => {
  it("falls back to the default document when nothing is stored", () => {
    expect(loadInstrumentDocument(createStorage()).tracks.length).toBe(
      createDefaultInstrumentDocument().tracks.length,
    );
  });

  it("round-trips a saved document", () => {
    const storage = createStorage();
    const document = {
      ...createDefaultInstrumentDocument(),
      name: "On Device",
    };

    saveInstrumentDocument(storage, document);

    expect(loadInstrumentDocument(storage).name).toBe("On Device");
  });

  it("boots on the default rather than throwing on an unreadable document", () => {
    const storage = createStorage({ "blibliki.instrument": "{not json" });

    expect(loadInstrumentDocument(storage).name).toBe(
      createDefaultInstrumentDocument().name,
    );
  });
});
