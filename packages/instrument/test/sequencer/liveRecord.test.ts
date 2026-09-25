import {
  type IStepSequencerProps,
  ModuleType,
  Resolution,
  type StepSequencerPosition,
} from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentSequencerStep } from "@/document/types";
import {
  clearStep,
  liveRecordTarget,
  nearestDuration,
  recordLiveNote,
  setLiveNoteDuration,
} from "@/sequencer/liveRecord";

const STEP_TICKS = 3840;

function createPatch(
  seededSteps: Record<number, Partial<InstrumentSequencerStep>> = {},
) {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0]!;
  const firstPage = firstTrack.sequencer.pages[0]!;

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
    noteSource: "stepSequencer",
    sequencer: {
      ...firstTrack.sequencer,
      loopLength: 2,
      pages: [
        {
          ...firstPage,
          steps: firstPage.steps.map((step, index) => ({
            ...step,
            ...seededSteps[index],
          })),
        },
        ...firstTrack.sequencer.pages.slice(1),
      ],
    },
  };

  return createInstrumentEnginePatch(document);
}

function getProps(runtimePatch: CompiledInstrumentEnginePatch) {
  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === "track-1.runtime.stepSequencer",
  );
  if (module?.moduleType !== ModuleType.StepSequencer) {
    throw new Error("Expected the first track's step sequencer");
  }

  return module.props as IStepSequencerProps;
}

function position(
  absoluteStep: number,
  offsetTicks: number,
): StepSequencerPosition {
  return {
    patternNo: 0,
    pageNo: Math.floor(absoluteStep / 16) % 2,
    stepNo: absoluteStep % 16,
    absoluteStep,
    offsetTicks,
    stepTicks: STEP_TICKS,
  };
}

describe("liveRecordTarget", () => {
  const props = getProps(createPatch());

  it("keeps the timing as microtime when quantize is off", () => {
    expect(liveRecordTarget(props, position(18, 1000), "off")).toEqual({
      pageIndex: 1,
      stepIndex: 2,
      lap: 0,
      microtimeOffset: 25,
    });
  });

  it("snaps to a coarser grid and drops the microtime", () => {
    // Step 19 is halfway between the eighths at 18 and 20.
    expect(liveRecordTarget(props, position(19, 0), Resolution.eighth)).toEqual(
      { pageIndex: 1, stepIndex: 4, lap: 0, microtimeOffset: 0 },
    );
    expect(
      liveRecordTarget(props, position(18, 1900), Resolution.eighth),
    ).toMatchObject({ pageIndex: 1, stepIndex: 2 });
  });

  it("never quantizes finer than the track's step", () => {
    expect(
      liveRecordTarget(props, position(5, -1800), Resolution.thirtysecond),
    ).toMatchObject({ pageIndex: 0, stepIndex: 5, microtimeOffset: 0 });
  });

  it("counts passes over the loop", () => {
    expect(
      liveRecordTarget(props, position(33, 0), Resolution.sixteenth),
    ).toEqual({ pageIndex: 0, stepIndex: 1, lap: 1, microtimeOffset: 0 });
  });
});

describe("recordLiveNote", () => {
  const target = { pageIndex: 0, stepIndex: 3, lap: 0, microtimeOffset: 12 };
  const seeded = {
    3: {
      active: true,
      notes: [{ note: "C3", velocity: 80 }],
      microtimeOffset: -5,
      probability: 60,
    },
  };

  it("overdub adds the note and keeps the step's timing", () => {
    const written = recordLiveNote(
      createPatch(seeded),
      target,
      { note: "E3", velocity: 100 },
      true,
      false,
    );

    expect(
      getProps(written!.runtimePatch).patterns[0]!.pages[0]!.steps[3],
    ).toMatchObject({
      active: true,
      notes: [
        { note: "C3", velocity: 80 },
        { note: "E3", velocity: 100 },
      ],
      microtimeOffset: -5,
      probability: 60,
    });
    expect(written?.update?.changes.props).toHaveProperty("patterns");
  });

  it("replace takes the step over on the first note of a pass, and later notes of the pass join", () => {
    const first = recordLiveNote(
      createPatch(seeded),
      target,
      { note: "E3", velocity: 100 },
      false,
      false,
    );

    expect(
      getProps(first!.runtimePatch).patterns[0]!.pages[0]!.steps[3],
    ).toMatchObject({
      notes: [{ note: "E3", velocity: 100 }],
      microtimeOffset: 12,
      probability: 60,
    });

    const second = recordLiveNote(
      first!.runtimePatch,
      target,
      { note: "G3", velocity: 90 },
      false,
      true,
    );

    expect(
      getProps(second!.runtimePatch).patterns[0]!.pages[0]!.steps[3]?.notes,
    ).toEqual([
      { note: "E3", velocity: 100 },
      { note: "G3", velocity: 90 },
    ]);
  });

  it("an empty step takes the track defaults for length and chance", () => {
    const written = recordLiveNote(
      createPatch(),
      target,
      { note: "E3", velocity: 100 },
      true,
      false,
    );

    expect(
      getProps(written!.runtimePatch).patterns[0]!.pages[0]!.steps[3],
    ).toMatchObject({
      active: true,
      notes: [{ note: "E3", velocity: 100 }],
      duration: "1/16",
      probability: 100,
      microtimeOffset: 12,
    });
  });
});

describe("note length and erase", () => {
  it("picks the duration nearest the held time", () => {
    expect(nearestDuration(3840)).toBe("1/16");
    expect(nearestDuration(7000)).toBe("1/8");
    expect(nearestDuration(500)).toBe("1/64");
  });

  it("writes the held length onto the step, and only when it changes", () => {
    const runtimePatch = createPatch({
      3: { active: true, notes: [{ note: "C3", velocity: 80 }] },
    });
    const target = { pageIndex: 0, stepIndex: 3, lap: 0, microtimeOffset: 0 };
    const longer = setLiveNoteDuration(runtimePatch, target, 7680);

    expect(
      getProps(longer!.runtimePatch).patterns[0]!.pages[0]!.steps[3]?.duration,
    ).toBe("1/8");
    expect(setLiveNoteDuration(longer!.runtimePatch, target, 7680)).toBeNull();
  });

  it("erases a step's notes and turns it off, and leaves an empty step alone", () => {
    const runtimePatch = createPatch({
      3: { active: true, notes: [{ note: "C3", velocity: 80 }] },
    });
    const cleared = clearStep(runtimePatch, 0, 3);

    expect(
      getProps(cleared!.runtimePatch).patterns[0]!.pages[0]!.steps[3],
    ).toMatchObject({ active: false, notes: [] });
    expect(clearStep(cleared!.runtimePatch, 0, 3)).toBeNull();
    expect(clearStep(runtimePatch, 0, 4)).toBeNull();
  });
});
