import {
  type IStepSequencerProps,
  MidiEvent,
  ModuleType,
} from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type {
  InstrumentDocument,
  InstrumentSequencerStep,
} from "@/document/types";
import { LaunchControlXL3Surface } from "@/surfaces/launchControlXL3/LaunchControlXL3Surface";

const SHIFT = 63;
const PAGE_UP = 106;
const PAGE_DOWN = 107;
const LOOP_LENGTH = 20;
const STEP_1 = 37;
const STEP_4 = 40;
const STEP_5 = 41;
const STEP_3 = 39;
const STEP_7 = 43;
const PROBABILITY = 14;
const PITCH_1 = 29;
const VELOCITY_1 = 21;

function createStepEditDocument(
  seededSteps: Record<number, Partial<InstrumentSequencerStep>> = {},
): InstrumentDocument {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0]!;
  const firstPage = firstTrack.sequencer.pages[0]!;

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
    noteSource: "stepSequencer",
    sequencer: {
      ...firstTrack.sequencer,
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

  return document;
}

function createStepEditPatch(
  seededSteps: Record<number, Partial<InstrumentSequencerStep>> = {},
) {
  return createInstrumentEnginePatch(createStepEditDocument(seededSteps), {
    navigation: { mode: "seqEdit" },
  });
}

function getSequencerProps(runtimePatch: CompiledInstrumentEnginePatch) {
  const stepSequencer = runtimePatch.patch.modules.find(
    (module) => module.id === "track-1.runtime.stepSequencer",
  );
  if (stepSequencer?.moduleType !== ModuleType.StepSequencer) {
    throw new Error("Expected the first track's step sequencer");
  }

  return stepSequencer.props as IStepSequencerProps;
}

function getSteps(runtimePatch: CompiledInstrumentEnginePatch, page = 0) {
  return getSequencerProps(runtimePatch).patterns[0]!.pages[page]!.steps;
}

function press(
  surface: LaunchControlXL3Surface,
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  now: number,
) {
  return surface.reduceEvent(runtimePatch, MidiEvent.fromCC(cc, 127, 0), now);
}

function release(
  surface: LaunchControlXL3Surface,
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  now: number,
) {
  return surface.reduceEvent(runtimePatch, MidiEvent.fromCC(cc, 0, 0), now);
}

function turn(
  surface: LaunchControlXL3Surface,
  runtimePatch: CompiledInstrumentEnginePatch,
  cc: number,
  delta: number,
  now = 0,
) {
  return surface.reduceEvent(
    runtimePatch,
    MidiEvent.fromCC(cc, 64 + delta, 0),
    now,
  );
}

describe("LaunchControlXL3Surface step entry", () => {
  it("a tap turns an empty step on with the track defaults", () => {
    const surface = new LaunchControlXL3Surface();
    const held = press(surface, createStepEditPatch(), STEP_4, 0);

    expect(held.command).toEqual({ type: "seqEdit.hold" });
    expect(held.runtimePatch.runtime.navigation.heldSteps).toEqual([
      { stepIndex: 3, pressedAt: 0, edited: false },
    ]);

    const tapped = release(surface, held.runtimePatch, STEP_4, 100);

    expect(tapped.command).toMatchObject({
      type: "seqEdit.update",
      update: { id: "track-1.runtime.stepSequencer" },
    });
    expect(tapped.runtimePatch.runtime.navigation.heldSteps).toEqual([]);
    expect(getSteps(tapped.runtimePatch)[3]).toMatchObject({
      active: true,
      notes: [{ note: "C3", velocity: 100 }],
      duration: "1/16",
      probability: 100,
    });
  });

  it("a tap on an active step turns it off and keeps its notes", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      3: { active: true, notes: [{ note: "E3", velocity: 90 }] },
    });

    const held = press(surface, runtimePatch, STEP_4, 0);
    const tapped = release(surface, held.runtimePatch, STEP_4, 50);

    expect(getSteps(tapped.runtimePatch)[3]).toMatchObject({
      active: false,
      notes: [{ note: "E3", velocity: 90 }],
    });
  });

  it("a press longer than the hold threshold does not toggle on release", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch();

    const held = press(surface, runtimePatch, STEP_4, 0);
    const released = release(surface, held.runtimePatch, STEP_4, 400);

    expect(released.command).toEqual({ type: "seqEdit.hold" });
    expect(released.runtimePatch.runtime.navigation.heldSteps).toEqual([]);
    expect(getSteps(released.runtimePatch)[3]?.active).toBe(false);
  });

  it("turning an encoder while holding edits the held step and the release does not toggle", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch();

    const held = press(surface, runtimePatch, STEP_4, 0);
    const edited = turn(surface, held.runtimePatch, PITCH_1, 1, 10);

    expect(edited.command).toMatchObject({
      type: "seqEdit.update",
      cc: PITCH_1,
      update: { id: "track-1.runtime.stepSequencer" },
    });
    expect(edited.runtimePatch.runtime.navigation.heldSteps).toEqual([
      { stepIndex: 3, pressedAt: 0, edited: true },
    ]);
    expect(getSteps(edited.runtimePatch)[3]).toMatchObject({
      active: true,
      notes: [{ note: "C3", velocity: 100 }],
    });

    const released = release(surface, edited.runtimePatch, STEP_4, 50);

    expect(released.command).toEqual({ type: "seqEdit.hold" });
    expect(getSteps(released.runtimePatch)[3]).toMatchObject({
      active: true,
      notes: [{ note: "C3", velocity: 100 }],
    });
  });

  it("edits every held step relative to its own value", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      0: { active: true, notes: [{ note: "C3", velocity: 100 }] },
      3: { active: true, notes: [{ note: "E3", velocity: 100 }] },
    });

    const first = press(surface, runtimePatch, STEP_1, 0);
    const both = press(surface, first.runtimePatch, STEP_4, 5);
    const edited = turn(surface, both.runtimePatch, PITCH_1, 1, 10);

    const steps = getSteps(edited.runtimePatch);
    expect(steps[0]?.notes[0]?.note).toBe("C#3");
    expect(steps[3]?.notes[0]?.note).toBe("F3");
    expect(steps[1]?.notes).toEqual([]);
  });

  it("with nothing held the encoders set the defaults new steps inherit", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch();

    const pitched = turn(surface, runtimePatch, PITCH_1, 2);

    expect(pitched.command).toEqual({ type: "seqEdit.update", cc: PITCH_1 });
    expect(pitched.runtimePatch.runtime.navigation.stepDefaults).toEqual({
      "track-1": { note: "D3" },
    });

    const softer = turn(surface, pitched.runtimePatch, VELOCITY_1, -20);
    const rarer = turn(surface, softer.runtimePatch, PROBABILITY, -10);
    const held = press(surface, rarer.runtimePatch, STEP_5, 0);
    const tapped = release(surface, held.runtimePatch, STEP_5, 50);

    expect(getSteps(tapped.runtimePatch)[4]).toMatchObject({
      active: true,
      notes: [{ note: "D3", velocity: 80 }],
      probability: 90,
    });
  });

  it("seeds the defaults from the first active step of the pattern", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      2: { active: true, notes: [{ note: "G2", velocity: 70 }] },
    });

    const held = press(surface, runtimePatch, STEP_5, 0);
    const tapped = release(surface, held.runtimePatch, STEP_5, 50);

    expect(getSteps(tapped.runtimePatch)[4]?.notes).toEqual([
      { note: "G2", velocity: 70 },
    ]);
  });

  it("a value set on a held step becomes the default for that value only", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      0: { active: true, notes: [{ note: "A2", velocity: 100 }] },
    });

    const held = press(surface, runtimePatch, STEP_1, 0);
    const edited = turn(surface, held.runtimePatch, PROBABILITY, -25, 10);
    const released = release(surface, edited.runtimePatch, STEP_1, 20);

    expect(released.runtimePatch.runtime.navigation.stepDefaults).toEqual({
      "track-1": { probability: 75 },
    });

    const held5 = press(surface, released.runtimePatch, STEP_5, 100);
    const tapped = release(surface, held5.runtimePatch, STEP_5, 150);

    expect(getSteps(tapped.runtimePatch)[4]).toMatchObject({
      notes: [{ note: "A2", velocity: 100 }],
      probability: 75,
    });
  });

  it("leaving step edit drops the held steps", () => {
    const surface = new LaunchControlXL3Surface();
    const held = press(surface, createStepEditPatch(), STEP_4, 0);

    const shifted = press(surface, held.runtimePatch, SHIFT, 10);
    const left = press(surface, shifted.runtimePatch, PAGE_UP, 20);

    expect(left.runtimePatch.runtime.navigation.mode).toBe("performance");
    expect(left.runtimePatch.runtime.navigation.heldSteps).toEqual([]);
  });
});

describe("LaunchControlXL3Surface bars", () => {
  it("growing the loop appends bars and fills an empty new bar from the one before it", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      0: { active: true, notes: [{ note: "C3", velocity: 100 }] },
    });

    const twoBars = turn(surface, runtimePatch, LOOP_LENGTH, 1);

    expect(getSequencerProps(twoBars.runtimePatch).loopLength).toBe(2);
    expect(getSteps(twoBars.runtimePatch, 1)).toEqual(
      getSteps(twoBars.runtimePatch, 0),
    );

    const fiveBars = turn(surface, twoBars.runtimePatch, LOOP_LENGTH, 3);
    const props = getSequencerProps(fiveBars.runtimePatch);

    expect(props.loopLength).toBe(5);
    expect(props.patterns[0]?.pages).toHaveLength(5);
    expect(getSteps(fiveBars.runtimePatch, 4)).toEqual(
      getSteps(fiveBars.runtimePatch, 0),
    );
    expect(fiveBars.command).toMatchObject({
      type: "seqEdit.update",
      update: { changes: { props: { loopLength: 5 } } },
    });
  });

  it("brings a bar that still holds steps back as it was when the loop grows again", () => {
    const surface = new LaunchControlXL3Surface();
    const document = createStepEditDocument({
      0: { active: true, notes: [{ note: "C3", velocity: 100 }] },
    });
    const secondPage = document.tracks[0]!.sequencer.pages[1]!;
    secondPage.steps[0] = {
      ...secondPage.steps[0]!,
      active: true,
      notes: [{ note: "D3", velocity: 90 }],
    };
    document.tracks[0]!.sequencer.loopLength = 2;
    const runtimePatch = createInstrumentEnginePatch(document, {
      navigation: { mode: "seqEdit" },
    });

    const oneBar = turn(surface, runtimePatch, LOOP_LENGTH, -1);
    expect(getSequencerProps(oneBar.runtimePatch).loopLength).toBe(1);

    const twoBars = turn(surface, oneBar.runtimePatch, LOOP_LENGTH, 1);

    expect(getSteps(twoBars.runtimePatch, 1)[0]?.notes).toEqual([
      { note: "D3", velocity: 90 },
    ]);
  });

  it("caps the loop at the engine's sixteen bars", () => {
    const surface = new LaunchControlXL3Surface();

    const capped = turn(surface, createStepEditPatch(), LOOP_LENGTH, 40);

    expect(getSequencerProps(capped.runtimePatch).loopLength).toBe(16);
    expect(
      getSequencerProps(capped.runtimePatch).patterns[0]?.pages,
    ).toHaveLength(16);
  });

  it("shift + page down duplicates the bar onto the next one and moves there", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      2: { active: true, notes: [{ note: "E3", velocity: 100 }] },
    });

    const shifted = press(surface, runtimePatch, SHIFT, 0);
    const duplicated = press(surface, shifted.runtimePatch, PAGE_DOWN, 10);

    expect(duplicated.command).toMatchObject({
      type: "seqEdit.update",
      update: { changes: { props: { loopLength: 2, activePageNo: 1 } } },
    });
    expect(duplicated.runtimePatch.runtime.navigation.sequencerPageIndex).toBe(
      1,
    );
    expect(getSteps(duplicated.runtimePatch, 1)).toEqual(
      getSteps(duplicated.runtimePatch, 0),
    );

    const again = press(surface, duplicated.runtimePatch, PAGE_DOWN, 20);

    expect(getSequencerProps(again.runtimePatch).loopLength).toBe(3);
    expect(again.runtimePatch.runtime.navigation.sequencerPageIndex).toBe(2);
    expect(getSteps(again.runtimePatch, 2)[2]?.notes).toEqual([
      { note: "E3", velocity: 100 },
    ]);
  });

  it("shift + page down overwrites the next bar inside the loop", () => {
    const surface = new LaunchControlXL3Surface();
    const document = createStepEditDocument({
      0: { active: true, notes: [{ note: "C3", velocity: 100 }] },
    });
    const secondPage = document.tracks[0]!.sequencer.pages[1]!;
    secondPage.steps[5] = {
      ...secondPage.steps[5]!,
      active: true,
      notes: [{ note: "G3", velocity: 90 }],
    };
    document.tracks[0]!.sequencer.loopLength = 2;
    const runtimePatch = createInstrumentEnginePatch(document, {
      navigation: { mode: "seqEdit" },
    });

    const shifted = press(surface, runtimePatch, SHIFT, 0);
    const duplicated = press(surface, shifted.runtimePatch, PAGE_DOWN, 10);

    expect(getSequencerProps(duplicated.runtimePatch).loopLength).toBe(2);
    expect(getSteps(duplicated.runtimePatch, 1)).toEqual(
      getSteps(duplicated.runtimePatch, 0),
    );
  });

  it("bar navigation wraps around the bars the pattern has", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch();

    const fiveBars = turn(surface, runtimePatch, LOOP_LENGTH, 4);
    let bar = fiveBars.runtimePatch;
    for (let i = 0; i < 4; i += 1) {
      bar = press(surface, bar, PAGE_UP, i).runtimePatch;
    }

    expect(bar.runtime.navigation.sequencerPageIndex).toBe(4);
    expect(
      press(surface, bar, PAGE_UP, 10).runtimePatch.runtime.navigation
        .sequencerPageIndex,
    ).toBe(0);
  });
});

describe("LaunchControlXL3Surface step copy", () => {
  const seeded = {
    2: {
      active: true,
      notes: [{ note: "E3", velocity: 90 }],
      probability: 80,
      duration: "1/8" as const,
    },
  };

  it("shift + step marks the copy source and every later tap pastes it", () => {
    const surface = new LaunchControlXL3Surface();
    const shifted = press(surface, createStepEditPatch(seeded), SHIFT, 0);

    const source = press(surface, shifted.runtimePatch, STEP_3, 10);

    expect(source.command).toEqual({ type: "seqEdit.hold" });
    expect(source.runtimePatch.runtime.navigation.copySource).toBe(2);
    expect(source.runtimePatch.runtime.navigation.heldSteps).toEqual([]);

    const pasted = press(surface, source.runtimePatch, STEP_5, 20);

    expect(pasted.command).toMatchObject({
      type: "seqEdit.update",
      update: { id: "track-1.runtime.stepSequencer" },
    });
    expect(getSteps(pasted.runtimePatch)[4]).toEqual(
      getSteps(pasted.runtimePatch)[2],
    );
    expect(pasted.runtimePatch.runtime.navigation.copySource).toBe(2);

    const pastedAgain = press(surface, pasted.runtimePatch, STEP_7, 30);

    expect(getSteps(pastedAgain.runtimePatch)[6]?.notes).toEqual([
      { note: "E3", velocity: 90 },
    ]);
  });

  it("releasing shift clears the copy source", () => {
    const surface = new LaunchControlXL3Surface();
    const shifted = press(surface, createStepEditPatch(seeded), SHIFT, 0);
    const source = press(surface, shifted.runtimePatch, STEP_3, 10);

    const released = release(surface, source.runtimePatch, SHIFT, 20);

    expect(released.runtimePatch.runtime.navigation.copySource).toBeUndefined();

    const tapped = release(
      surface,
      press(surface, released.runtimePatch, STEP_5, 30).runtimePatch,
      STEP_5,
      40,
    );

    expect(getSteps(tapped.runtimePatch)[4]?.notes).toEqual([
      { note: "E3", velocity: 90 },
    ]);
    expect(getSteps(tapped.runtimePatch)[4]?.probability).toBe(80);
  });

  it("a step release while shift is held toggles nothing", () => {
    const surface = new LaunchControlXL3Surface();
    const shifted = press(surface, createStepEditPatch(seeded), SHIFT, 0);
    const source = press(surface, shifted.runtimePatch, STEP_3, 10);

    const released = release(surface, source.runtimePatch, STEP_3, 20);

    expect(released.command).toEqual({ type: "none" });
    expect(getSteps(released.runtimePatch)[2]?.active).toBe(true);
  });
});
