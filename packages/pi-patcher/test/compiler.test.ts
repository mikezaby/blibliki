import { describe, expect, it } from "vitest";
import {
  compilePiPatcherDocument,
  createDefaultPiPatcherDocument,
  validatePiPatcherDocument,
  withTrackEffectType,
  withTrackSourceProfile,
} from "@/index";

describe("@blibliki/pi-patcher", () => {
  it("creates a valid default document", () => {
    const document = createDefaultPiPatcherDocument();
    expect(validatePiPatcherDocument(document)).toEqual([]);
    expect(document.tracks).toHaveLength(8);
  });

  it("compiles deterministic global and track module ids", () => {
    const base = createDefaultPiPatcherDocument();
    base.tracks[0] = withTrackSourceProfile(base.tracks[0]!, "osc");
    base.tracks[0] = withTrackEffectType(base.tracks[0]!, 0, "delay");

    const compiled = compilePiPatcherDocument(base);
    const moduleIds = compiled.engine.modules.map((module) => module.id);

    expect(moduleIds).toContain("global-master-filter");
    expect(moduleIds).toContain("track-1-note-source");
    expect(moduleIds).toContain("track-1-source-osc");
    expect(moduleIds).toContain("track-1-fx-1");
  });

  it("produces semantic bindings for global, source, and fx controls", () => {
    const base = createDefaultPiPatcherDocument();
    base.tracks[0] = withTrackSourceProfile(base.tracks[0]!, "osc");
    base.tracks[0] = withTrackEffectType(base.tracks[0]!, 0, "delay");

    const compiled = compilePiPatcherDocument(base);

    expect(compiled.bindings["global.bpm"]).toMatchObject({
      kind: "transport",
      transportProp: "bpm",
    });
    expect(compiled.bindings["track.0.track.source.wave"]).toMatchObject({
      kind: "module",
    });
    expect(compiled.bindings["track.0.track.fx.0.time"]).toMatchObject({
      kind: "module",
    });
  });

  it("fails validation when a track count is invalid", () => {
    const document = createDefaultPiPatcherDocument();
    document.tracks = document.tracks.slice(0, 1);
    expect(validatePiPatcherDocument(document)).toContain(
      "Expected 8 tracks, received 1",
    );
  });
});
