import { describe, expect, it } from "vitest";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import {
  CURRENT_INSTRUMENT_VERSION,
  migrateInstrumentDocument,
} from "@/document/version";
import {
  DEFAULT_GLOBAL_MACRO_IDS,
  GLOBAL_MACRO_SLOT_IDS,
} from "@/macros/defaultMacros";

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

  it("moves drum machine patterns with the note map (v3 -> v4)", () => {
    const document = createDefaultInstrumentDocument();
    document.version = "3";
    const withNotes = (
      track: (typeof document.tracks)[number],
      notes: string[],
    ) => ({
      ...track,
      sequencer: {
        ...track.sequencer,
        pages: track.sequencer.pages.map((page, pageIndex) => ({
          ...page,
          steps: page.steps.map((step, stepIndex) =>
            pageIndex === 0 && stepIndex === 0
              ? {
                  ...step,
                  active: true,
                  notes: notes.map((note) => ({ note, velocity: 100 })),
                }
              : step,
          ),
        })),
      },
    });
    const firstNotes = (track: (typeof document.tracks)[number]) =>
      track.sequencer.pages[0]!.steps[0]!.notes.map((note) => note.note);
    document.tracks[0] = {
      ...withNotes(document.tracks[0]!, ["C1", "F#1", "C4"]),
      sourceProfileId: "drumMachine",
    };
    document.tracks[1] = {
      ...withNotes(document.tracks[1]!, ["C1"]),
      sourceProfileId: "osc",
    };

    const migrated = migrateInstrumentDocument(document);

    expect(migrated.version).toBe(CURRENT_INSTRUMENT_VERSION);
    expect(firstNotes(migrated.tracks[0]!)).toEqual(["C3", "F#3", "C4"]);
    expect(firstNotes(migrated.tracks[1]!)).toEqual(["C1"]);
    expect(migrateInstrumentDocument(migrated)).toBe(migrated);
  });

  it("fills default global macro controller data when missing", () => {
    const document = createDefaultInstrumentDocument();
    delete (
      document as Partial<ReturnType<typeof createDefaultInstrumentDocument>>
    ).globalController;

    const migrated = migrateInstrumentDocument(document);

    expect(migrated.globalController.macros.map((macro) => macro.id)).toEqual(
      DEFAULT_GLOBAL_MACRO_IDS,
    );
    expect(
      migrated.globalController.encoderSlots[GLOBAL_MACRO_SLOT_IDS[0]],
    ).toEqual({
      type: "macro",
      macroId: DEFAULT_GLOBAL_MACRO_IDS[0],
    });
  });
});
