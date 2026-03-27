import {
  type IStepSequencerProps,
  ModuleType,
  PlaybackMode,
  Resolution,
} from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("createInstrumentEnginePatch noteSource", () => {
  it("routes step-sequencer tracks through a local sequencer instead of external midi channel filters", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      noteSource: "stepSequencer",
      sourceProfileId: "osc",
    };

    const runtime = createInstrumentEnginePatch(document);

    expect(runtime.runtime.stepSequencerIds["track-1"]).toBe(
      "track-1.runtime.stepSequencer",
    );

    expect(
      runtime.patch.modules.some(
        (module) =>
          module.id === "track-1.runtime.stepSequencer" &&
          module.moduleType === ModuleType.StepSequencer,
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.runtime.stepSequencer" &&
          source.ioName === "midi" &&
          destination.moduleId === "track-1.runtime.voiceScheduler" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.runtime.voiceScheduler" &&
          source.ioName === "midi out" &&
          destination.moduleId === "track-1.source.main" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.noteInput" &&
          destination.moduleId === "track-1.runtime.midiChannelFilter",
      ),
    ).toBe(false);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.noteInput" &&
          source.ioName === "midi out" &&
          destination.moduleId === "track-2.runtime.midiChannelFilter" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);
  });

  it("compiles the authored track sequencer into step-sequencer module props", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      noteSource: "stepSequencer",
      sourceProfileId: "osc",
      sequencer: {
        loopLength: 2,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        pages: [
          {
            name: "Page 1",
            steps: [
              {
                active: true,
                notes: [{ note: "C4", velocity: 100 }],
                probability: 100,
                microtimeOffset: 0,
                duration: "1/16",
              },
              ...Array.from({ length: 15 }, () => ({
                active: false,
                notes: [],
                probability: 100,
                microtimeOffset: 0,
                duration: "1/16" as const,
              })),
            ],
          },
          {
            name: "Page 2",
            steps: [
              {
                active: false,
                notes: [],
                probability: 100,
                microtimeOffset: 0,
                duration: "1/16",
              },
              {
                active: true,
                notes: [{ note: "E4", velocity: 90 }],
                probability: 100,
                microtimeOffset: 0,
                duration: "1/16",
              },
              ...Array.from({ length: 14 }, () => ({
                active: false,
                notes: [],
                probability: 100,
                microtimeOffset: 0,
                duration: "1/16" as const,
              })),
            ],
          },
          ...Array.from({ length: 2 }, (_, index) => ({
            name: `Page ${index + 3}`,
            steps: Array.from({ length: 16 }, () => ({
              active: false,
              notes: [],
              probability: 100,
              microtimeOffset: 0,
              duration: "1/16" as const,
            })),
          })),
        ],
      },
    } as typeof firstTrack;

    const runtime = createInstrumentEnginePatch(document);
    const stepSequencer = runtime.patch.modules.find(
      (module) => module.id === "track-1.runtime.stepSequencer",
    );

    if (
      !stepSequencer ||
      stepSequencer.moduleType !== ModuleType.StepSequencer
    ) {
      throw new Error("Expected compiled step sequencer module");
    }

    const stepSequencerProps = stepSequencer.props as IStepSequencerProps;

    expect(stepSequencerProps.activePatternNo).toBe(0);
    expect(stepSequencerProps.activePageNo).toBe(0);
    expect(stepSequencerProps.loopLength).toBe(2);
    expect(stepSequencerProps.stepsPerPage).toBe(16);
    expect(stepSequencerProps.resolution).toBe(Resolution.sixteenth);
    expect(stepSequencerProps.playbackMode).toBe(PlaybackMode.loop);
    expect(stepSequencerProps.patterns).toHaveLength(1);

    const pattern = stepSequencerProps.patterns[0];
    expect(pattern?.name).toBe("A");
    expect(pattern?.pages).toHaveLength(4);

    const firstPage = pattern?.pages[0];
    expect(firstPage?.name).toBe("Page 1");
    expect(firstPage?.steps[0]).toEqual(
      expect.objectContaining({
        active: true,
        notes: [{ note: "C4", velocity: 100 }],
      }),
    );

    const secondPage = pattern?.pages[1];
    expect(secondPage?.name).toBe("Page 2");
    expect(secondPage?.steps[1]).toEqual(
      expect.objectContaining({
        active: true,
        notes: [{ note: "E4", velocity: 90 }],
      }),
    );

    expect(pattern?.pages[2]?.name).toBe("Page 3");
    expect(pattern?.pages[3]?.name).toBe("Page 4");
  });
});
