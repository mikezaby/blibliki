import { describe, expect, it } from "vitest";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("createDefaultInstrumentDocument", () => {
  it("creates the fixed parent instrument document shape for the default template", () => {
    const document = createDefaultInstrumentDocument();

    expect(document.version).toBe("2");
    expect(document.name).toBe("Default Instrument");
    expect(document.templateId).toBe("default-performance-instrument");
    expect(document.hardwareProfileId).toBe("launchcontrolxl3-pi-lcd");

    expect(document.globalBlock).toEqual({
      tempo: 120,
      swing: 0,
      masterFilterCutoff: 20000,
      masterFilterResonance: 1,
      reverbSend: 0,
      delaySend: 0,
      masterVolume: 0,
      probabilityAmount: 1,
    });

    expect(document.tracks).toHaveLength(8);
    expect(
      document.tracks.map(
        ({
          key,
          midiChannel,
          noteSource,
          audioSource,
          sourceProfileId,
          fxChain,
        }) => ({
          key,
          midiChannel,
          noteSource,
          audioSource,
          sourceProfileId,
          fxChain,
        }),
      ),
    ).toEqual([
      {
        key: "track-1",
        midiChannel: 1,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-2",
        midiChannel: 2,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-3",
        midiChannel: 3,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-4",
        midiChannel: 4,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-5",
        midiChannel: 5,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-6",
        midiChannel: 6,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-7",
        midiChannel: 7,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
      {
        key: "track-8",
        midiChannel: 8,
        noteSource: "externalMidi",
        audioSource: { type: "internal" },
        sourceProfileId: "unassigned",
        fxChain: ["distortion", "chorus", "delay", "reverb"],
      },
    ]);
  });
});
