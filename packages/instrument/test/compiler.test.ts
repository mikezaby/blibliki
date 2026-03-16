import { describe, expect, it } from "vitest";
import {
  compileInstrumentDocument,
  createDefaultInstrumentDocument,
  validateInstrumentDocument,
  withTrackEffectType,
  withTrackSourceProfile,
} from "../src/index";

describe("@blibliki/instrument", () => {
  it("creates a valid default document", () => {
    const document = createDefaultInstrumentDocument();
    expect(validateInstrumentDocument(document)).toEqual([]);
    expect(document.tracks).toHaveLength(8);
    expect(document.tracks[0]?.voices).toBe(1);
    expect(
      document.tracks[0]?.stepSequencer?.pages[0]?.steps[0]?.notes,
    ).toHaveLength(1);
  });

  it("compiles deterministic global and track module ids", () => {
    const base = createDefaultInstrumentDocument();
    const track = base.tracks[0];
    if (!track) {
      throw new Error("Expected default document to include track 1");
    }

    base.tracks[0] = withTrackSourceProfile(track, "osc");
    base.tracks[0] = withTrackEffectType(base.tracks[0], 0, "delay");

    const compiled = compileInstrumentDocument(base);
    const moduleIds = compiled.engine.modules.map((module) => module.id);

    expect(moduleIds).toContain("global-master-filter");
    expect(moduleIds).toContain("track-1-note-source");
    expect(moduleIds).toContain("track-1-source-osc");
    expect(moduleIds).toContain("track-1-fx-1");
  });

  it("produces semantic bindings for global, source, and fx controls", () => {
    const base = createDefaultInstrumentDocument();
    const track = base.tracks[0];
    if (!track) {
      throw new Error("Expected default document to include track 1");
    }

    base.tracks[0] = withTrackSourceProfile(track, "osc");
    base.tracks[0] = withTrackEffectType(base.tracks[0], 0, "delay");

    const compiled = compileInstrumentDocument(base);

    expect(compiled.bindings["global.bpm"]).toMatchObject({
      kind: "transport",
      transportProp: "bpm",
    });
    expect(compiled.bindings["track.0.source.wave"]).toMatchObject({
      kind: "module",
    });
    expect(compiled.bindings["track.0.fx.0.time"]).toMatchObject({
      kind: "module",
    });
  });

  it("fails validation when a track count is invalid", () => {
    const document = createDefaultInstrumentDocument();
    document.tracks = document.tracks.slice(0, 1);
    expect(validateInstrumentDocument(document)).toContain(
      "Expected 8 tracks, received 1",
    );
  });

  it("compiles track polyphony from authored voices and validates sequencer note counts", () => {
    const document = createDefaultInstrumentDocument();
    const track = document.tracks[0];
    if (!track?.stepSequencer) {
      throw new Error("Expected default document to include sequencer data");
    }

    document.tracks[0] = withTrackSourceProfile(track, "osc");
    const activeTrack = document.tracks[0];
    if (!activeTrack.stepSequencer) {
      throw new Error("Expected sequencer data after source profile update");
    }

    activeTrack.voices = 3;
    activeTrack.stepSequencer.pages.forEach((page) => {
      page.steps.forEach((step) => {
        step.notes = [
          { pitch: "C4", velocity: 100 },
          { pitch: "E4", velocity: 100 },
          { pitch: "G4", velocity: 100 },
        ];
      });
    });

    expect(validateInstrumentDocument(document)).toEqual([]);

    const compiled = compileInstrumentDocument(document);
    const sourceModule = compiled.engine.modules.find(
      (module) => module.id === "track-1-source-osc",
    );
    const ampModule = compiled.engine.modules.find(
      (module) => module.id === "track-1-amp-env",
    );
    expect(
      sourceModule && "voices" in sourceModule
        ? sourceModule.voices
        : undefined,
    ).toBe(3);
    expect(
      ampModule && "voices" in ampModule ? ampModule.voices : undefined,
    ).toBe(3);

    activeTrack.stepSequencer.pages[0]!.steps[0]!.notes.pop();
    expect(validateInstrumentDocument(document)).toContain(
      "Track 1 page 1 step 1 must define 3 notes",
    );
  });
});
