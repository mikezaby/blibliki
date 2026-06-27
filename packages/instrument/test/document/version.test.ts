import { describe, expect, it } from "vitest";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import {
  CURRENT_INSTRUMENT_VERSION,
  migrateInstrumentDocument,
} from "@/document/version";

describe("migrateInstrumentDocument", () => {
  it("returns the same document when already current", () => {
    const document = createDefaultInstrumentDocument();
    expect(document.version).toBe(CURRENT_INSTRUMENT_VERSION);
    expect(migrateInstrumentDocument(document)).toBe(document);
  });

  it("converts a v1 legacy gain masterVolume to dB and bumps the version", () => {
    const document = createDefaultInstrumentDocument();
    document.version = "1";
    document.globalBlock.masterVolume = 1; // unity gain -> 0 dB

    const migrated = migrateInstrumentDocument(document);

    expect(migrated.version).toBe(CURRENT_INSTRUMENT_VERSION);
    expect(migrated.globalBlock.masterVolume).toBeCloseTo(0);
  });

  it("is idempotent once migrated, preserving a dB masterVolume", () => {
    const document = createDefaultInstrumentDocument();
    document.version = "1";
    document.globalBlock.masterVolume = 1;

    const once = migrateInstrumentDocument(document);
    const twice = migrateInstrumentDocument(once);

    expect(twice.globalBlock.masterVolume).toBe(once.globalBlock.masterVolume);
  });
});
