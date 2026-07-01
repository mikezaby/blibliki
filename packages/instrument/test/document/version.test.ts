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

  it("moves the legacy global effect chain onto a master track (v2 -> v3)", () => {
    const document = createDefaultInstrumentDocument();
    document.version = "2";
    // Simulate a pre-v3 document: no master track, legacy effect globals.
    document.tracks = document.tracks.filter(
      (track) => track.audioSource?.type !== "master",
    );
    const legacy = document.globalBlock as unknown as Record<string, number>;
    legacy.masterFilterCutoff = 1400;
    legacy.masterFilterResonance = 6.5;
    legacy.delaySend = 0.37;
    legacy.reverbSend = 0.61;

    const migrated = migrateInstrumentDocument(document);
    const master = migrated.tracks.find(
      (track) => track.audioSource?.type === "master",
    );

    expect(migrated.version).toBe(CURRENT_INSTRUMENT_VERSION);
    expect(master?.fxChain).toEqual(["delay", "reverb", "none", "none"]);
    expect(master?.controllerSlotValues).toMatchObject({
      "filter.cutoff": 1400,
      "filter.Q": 6.5,
      "fx1.mix": 0.37,
      "fx2.mix": 0.61,
    });
  });
});
