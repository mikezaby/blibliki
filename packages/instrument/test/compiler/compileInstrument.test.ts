import { describe, expect, it } from "vitest";
import { compileInstrument } from "@/compiler/compileInstrument";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("compileInstrument", () => {
  it("compiles the default instrument document into per-track compiled units", () => {
    const compiled = compileInstrument(createDefaultInstrumentDocument());

    expect(compiled.version).toBe("1");
    expect(compiled.name).toBe("Default Instrument");
    expect(compiled.templateId).toBe("default-performance-instrument");
    expect(compiled.hardwareProfileId).toBe("launchcontrolxl3-pi-lcd");
    expect(compiled.globalBlock).toEqual({
      tempo: 120,
      swing: 0,
      masterFilterCutoff: 20000,
      masterFilterResonance: 1,
      reverbSend: 0,
      delaySend: 0,
      masterVolume: 1,
    });

    expect(compiled.tracks).toHaveLength(8);
    expect(
      compiled.tracks.map(
        ({
          key,
          midiChannel,
          noteSource,
          sourceProfileId,
          fxChain,
          compiledTrack,
        }) => ({
          key,
          midiChannel,
          noteSource,
          sourceProfileId,
          fxChain,
          compiledTrackKey: compiledTrack.key,
          pageKeys: compiledTrack.pages.map((page) => page.key),
        }),
      ),
    ).toEqual([
      {
        key: "track-1",
        midiChannel: 1,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-1",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-2",
        midiChannel: 2,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-2",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-3",
        midiChannel: 3,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-3",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-4",
        midiChannel: 4,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-4",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-5",
        midiChannel: 5,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-5",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-6",
        midiChannel: 6,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-6",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-7",
        midiChannel: 7,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-7",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
      {
        key: "track-8",
        midiChannel: 8,
        noteSource: "externalMidi",
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
        compiledTrackKey: "track-8",
        pageKeys: ["sourceAmp", "filterMod", "fx"],
      },
    ]);
  });

  it("skips disabled tracks and preserves enabled-track order", () => {
    const document = createDefaultInstrumentDocument();
    const track2 = document.tracks[1];
    const track4 = document.tracks[3];
    const track7 = document.tracks[6];

    if (!track2 || !track4 || !track7) {
      throw new Error("Expected default document to expose tracks 2, 4, and 7");
    }

    document.tracks[0] = { ...document.tracks[0]!, enabled: false };
    document.tracks[1] = { ...track2, sourceProfileId: "osc" };
    document.tracks[2] = { ...document.tracks[2]!, enabled: false };
    document.tracks[3] = { ...track4, enabled: false };
    document.tracks[4] = { ...document.tracks[4]!, enabled: false };
    document.tracks[5] = { ...document.tracks[5]!, enabled: false };
    document.tracks[6] = {
      ...track7,
      noteSource: "stepSequencer",
      sourceProfileId: "threeOsc",
    };
    document.tracks[7] = { ...document.tracks[7]!, enabled: false };

    const compiled = compileInstrument(document);

    expect(compiled.tracks.map((track) => track.key)).toEqual([
      "track-2",
      "track-7",
    ]);
    expect(compiled.tracks.map((track) => track.midiChannel)).toEqual([2, 7]);
    expect(
      compiled.launchControlXL3.pages.map((page) => page.trackKey),
    ).toEqual([
      "track-2",
      "track-2",
      "track-2",
      "track-7",
      "track-7",
      "track-7",
    ]);
  });

  it("throws when no tracks are enabled", () => {
    const document = createDefaultInstrumentDocument();
    document.tracks = document.tracks.map((track) => ({
      ...track,
      enabled: false,
    }));

    expect(() => compileInstrument(document)).toThrow(
      "Instrument must have at least one enabled track",
    );
  });

  it("uses track voices before the global compile fallback", () => {
    const document = createDefaultInstrumentDocument();
    document.tracks[0] = {
      ...document.tracks[0]!,
      sourceProfileId: "osc",
      voices: 3,
    };

    const compiled = compileInstrument(document, {
      trackVoices: 12,
    });
    const sourceModule = compiled.tracks[0]?.compiledTrack.engine.modules.find(
      (module) => module.id === "track-1.source.main",
    );

    expect(sourceModule?.voices).toBe(3);
  });
});
