import {
  type IStepSequencerProps,
  MidiEvent,
  ModuleType,
  Note,
} from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type {
  InstrumentDocument,
  InstrumentSequencerStep,
} from "@/document/types";
import { getStepStates } from "@/sequencer/stepEntry";
import { createLaunchControlXL3SequencerDisplayState } from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerDisplay";
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
const PULSES = 13;
const ROTATE = 14;
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

function createDrumStepEditPatch(
  seededSteps: Record<number, Partial<InstrumentSequencerStep>> = {},
) {
  const document = createStepEditDocument(seededSteps);
  document.tracks[0] = {
    ...document.tracks[0]!,
    sourceProfileId: "drumMachine",
  };

  return createInstrumentEnginePatch(document, {
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

// A key on the note input, which sends on channel 1 as the computer keyboard
// and a keyboard at its default do.
function play(
  surface: LaunchControlXL3Surface,
  runtimePatch: CompiledInstrumentEnginePatch,
  noteName: string,
  velocity = 100,
  noteOn = true,
  now = 0,
) {
  const note = new Note(noteName);
  note.velocity = velocity / 127;

  return surface.reduceEvent(
    runtimePatch,
    MidiEvent.fromNote(note, noteOn, 0),
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

describe("LaunchControlXL3Surface fill", () => {
  function activeNotes(runtimePatch: CompiledInstrumentEnginePatch) {
    return getSteps(runtimePatch).map((step) =>
      step.active ? step.notes.map((note) => note.note).join("+") : "",
    );
  }

  it("shift + pulses previews a euclidean fill and writes it when shift is released", () => {
    const surface = new LaunchControlXL3Surface();
    const shifted = press(surface, createStepEditPatch(), SHIFT, 0);

    const previewed = turn(surface, shifted.runtimePatch, PULSES, 4, 10);

    expect(previewed.command).toEqual({ type: "seqEdit.update", cc: PULSES });
    expect(previewed.runtimePatch.runtime.navigation.fill).toEqual({
      pulses: 4,
      rotate: 0,
    });
    expect(activeNotes(previewed.runtimePatch).every((n) => n === "")).toBe(
      true,
    );

    const written = release(surface, previewed.runtimePatch, SHIFT, 20);

    expect(written.command).toMatchObject({
      type: "seqEdit.update",
      update: { id: "track-1.runtime.stepSequencer" },
    });
    expect(written.runtimePatch.runtime.navigation.fill).toBeUndefined();
    expect(activeNotes(written.runtimePatch)).toEqual([
      "C3",
      "",
      "",
      "",
      "C3",
      "",
      "",
      "",
      "C3",
      "",
      "",
      "",
      "C3",
      "",
      "",
      "",
    ]);
  });

  it("rotate moves the hits off the beat", () => {
    const surface = new LaunchControlXL3Surface();
    const shifted = press(surface, createStepEditPatch(), SHIFT, 0);
    const pulsed = turn(surface, shifted.runtimePatch, PULSES, 4, 10);
    const rotated = turn(surface, pulsed.runtimePatch, ROTATE, 2, 20);

    const written = release(surface, rotated.runtimePatch, SHIFT, 30);

    expect(activeNotes(written.runtimePatch)).toEqual([
      "",
      "",
      "C3",
      "",
      "",
      "",
      "C3",
      "",
      "",
      "",
      "C3",
      "",
      "",
      "",
      "C3",
      "",
    ]);
  });

  it("the fill places and removes only the default note", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      0: {
        active: true,
        notes: [
          { note: "C3", velocity: 100 },
          { note: "E3", velocity: 100 },
        ],
      },
      4: { active: true, notes: [{ note: "G3", velocity: 100 }] },
      6: { active: true, notes: [{ note: "C3", velocity: 100 }] },
    });
    const shifted = press(surface, runtimePatch, SHIFT, 0);

    // Two steps hold C3 already, so one tick makes three pulses.
    const pulsed = turn(surface, shifted.runtimePatch, PULSES, 1, 10);
    expect(pulsed.runtimePatch.runtime.navigation.fill?.pulses).toBe(3);

    const written = release(surface, pulsed.runtimePatch, SHIFT, 20);

    expect(activeNotes(written.runtimePatch)).toEqual([
      "C3+E3",
      "",
      "",
      "",
      "G3",
      "C3",
      "",
      "",
      "",
      "",
      "C3",
      "",
      "",
      "",
      "",
      "",
    ]);
  });

  it("pressing shift for something else writes nothing", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      3: { active: true, notes: [{ note: "E3", velocity: 100 }] },
    });
    const shifted = press(surface, runtimePatch, SHIFT, 0);

    const released = release(surface, shifted.runtimePatch, SHIFT, 10);

    expect(released.command).toEqual({ type: "none" });
    expect(getSteps(released.runtimePatch)).toEqual(getSteps(runtimePatch));
  });

  it("shift + a pitch encoder moves the held step an octave per tick", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      0: { active: true, notes: [{ note: "C3", velocity: 100 }] },
    });
    const held = press(surface, runtimePatch, STEP_1, 0);
    const shifted = press(surface, held.runtimePatch, SHIFT, 5);

    const octaveUp = turn(surface, shifted.runtimePatch, PITCH_1, 1, 10);

    expect(getSteps(octaveUp.runtimePatch)[0]?.notes[0]?.note).toBe("C4");
  });
});

describe("LaunchControlXL3Surface step entry on a drum machine track", () => {
  it("a tap places the first drum part", () => {
    const surface = new LaunchControlXL3Surface();
    const held = press(surface, createDrumStepEditPatch(), STEP_4, 0);
    const tapped = release(surface, held.runtimePatch, STEP_4, 100);

    expect(getSteps(tapped.runtimePatch)[3]?.notes).toEqual([
      { note: "C1", velocity: 100 },
    ]);
  });

  it("the pitch encoder steps through the drum parts", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createDrumStepEditPatch({
      0: { active: true, notes: [{ note: "C1", velocity: 100 }] },
    });
    const held = press(surface, runtimePatch, STEP_1, 0);

    const snare = turn(surface, held.runtimePatch, PITCH_1, 1, 10);
    expect(getSteps(snare.runtimePatch)[0]?.notes[0]?.note).toBe("D1");

    const closedHat = turn(surface, snare.runtimePatch, PITCH_1, 2, 20);
    expect(getSteps(closedHat.runtimePatch)[0]?.notes[0]?.note).toBe("F#1");
  });

  it("with nothing held the pitch encoder picks the default drum part", () => {
    const surface = new LaunchControlXL3Surface();

    const pitched = turn(surface, createDrumStepEditPatch(), PITCH_1, 1);

    expect(pitched.runtimePatch.runtime.navigation.stepDefaults).toEqual({
      "track-1": { note: "D1" },
    });
  });

  it("the display names the drum part", () => {
    const runtimePatch = createDrumStepEditPatch();

    const displayState =
      createLaunchControlXL3SequencerDisplayState(runtimePatch);

    expect(displayState?.lowerBand.slots[0]).toMatchObject({
      valueText: "Kick",
    });
  });
});

describe("LaunchControlXL3Surface played notes", () => {
  it("a note played into a held step replaces its notes, and the release does not toggle", () => {
    const surface = new LaunchControlXL3Surface();
    const held = press(surface, createStepEditPatch(), STEP_4, 0);
    const played = play(surface, held.runtimePatch, "D4", 90);

    expect(played.command.type).toBe("seqEdit.update");
    expect(getSteps(played.runtimePatch)[3]).toMatchObject({
      active: true,
      notes: [{ note: "D4", velocity: 90 }],
    });
    expect(played.runtimePatch.runtime.navigation.heldSteps[0]).toMatchObject({
      edited: true,
      played: true,
    });

    const released = release(surface, played.runtimePatch, STEP_4, 100);

    expect(released.command).toEqual({ type: "seqEdit.hold" });
    expect(getSteps(released.runtimePatch)[3]?.active).toBe(true);
  });

  it("later notes join the chord at the first note's velocity, up to eight", () => {
    const surface = new LaunchControlXL3Surface();
    let result = press(surface, createStepEditPatch(), STEP_4, 0);
    const notes = ["C3", "E3", "G3", "B3", "D4", "F4", "A4", "C5", "E5"];

    notes.forEach((note, index) => {
      result = play(surface, result.runtimePatch, note, index === 0 ? 100 : 40);
    });

    expect(getSteps(result.runtimePatch)[3]?.notes).toEqual(
      notes.slice(0, 8).map((note) => ({ note, velocity: 100 })),
    );
  });

  it("the first note keeps the step's length, chance and timing", () => {
    const surface = new LaunchControlXL3Surface();
    const runtimePatch = createStepEditPatch({
      3: {
        active: true,
        notes: [{ note: "C3", velocity: 80 }],
        probability: 50,
        duration: "1/8",
        microtimeOffset: 7,
      },
    });
    const held = press(surface, runtimePatch, STEP_4, 0);
    const played = play(surface, held.runtimePatch, "F3", 100);

    expect(getSteps(played.runtimePatch)[3]).toMatchObject({
      notes: [{ note: "F3", velocity: 100 }],
      probability: 50,
      duration: "1/8",
      microtimeOffset: 7,
    });
  });

  it("keys held while a step is tapped stamp their chord onto it", () => {
    const surface = new LaunchControlXL3Surface();
    const first = play(surface, createStepEditPatch(), "C3", 100);
    const second = play(surface, first.runtimePatch, "E3", 60);

    expect(second.runtimePatch.runtime.navigation.heldNotes).toEqual([
      { note: "C3", velocity: 100 },
      { note: "E3", velocity: 60 },
    ]);

    const held = press(surface, second.runtimePatch, STEP_5, 0);
    const tapped = release(surface, held.runtimePatch, STEP_5, 100);

    expect(tapped.command.type).toBe("seqEdit.update");
    expect(getSteps(tapped.runtimePatch)[4]).toMatchObject({
      active: true,
      notes: [
        { note: "C3", velocity: 100 },
        { note: "E3", velocity: 100 },
      ],
    });

    const lifted = play(
      surface,
      play(surface, tapped.runtimePatch, "C3", 0, false).runtimePatch,
      "E3",
      0,
      false,
    );

    expect(lifted.runtimePatch.runtime.navigation.heldNotes).toBeUndefined();

    // With the keys up a tap toggles again, and the last note played is now
    // what a new step gets.
    const toggled = release(
      surface,
      press(surface, lifted.runtimePatch, STEP_7, 200).runtimePatch,
      STEP_7,
      300,
    );

    expect(getSteps(toggled.runtimePatch)[6]?.notes).toEqual([
      { note: "E3", velocity: 100 },
    ]);
  });

  it("the last note played becomes the default note for new steps", () => {
    const surface = new LaunchControlXL3Surface();
    const played = play(
      surface,
      play(surface, createStepEditPatch(), "D4", 50).runtimePatch,
      "D4",
      0,
      false,
    );

    expect(played.command).toEqual({ type: "none" });
    expect(
      played.runtimePatch.runtime.navigation.stepDefaults["track-1"],
    ).toEqual({ note: "D4" });

    const tapped = release(
      surface,
      press(surface, played.runtimePatch, STEP_1, 0).runtimePatch,
      STEP_1,
      100,
    );

    expect(getSteps(tapped.runtimePatch)[0]?.notes).toEqual([
      { note: "D4", velocity: 100 },
    ]);
  });

  it("ignores notes on another channel and outside Step Edit", () => {
    const surface = new LaunchControlXL3Surface();
    const document = createStepEditDocument();
    document.tracks[0] = { ...document.tracks[0]!, midiChannel: 2 };
    const otherChannel = createInstrumentEnginePatch(document, {
      navigation: { mode: "seqEdit" },
    });
    const performance = createInstrumentEnginePatch(createStepEditDocument());

    expect(play(surface, otherChannel, "C3").runtimePatch).toBe(otherChannel);
    expect(play(surface, performance, "C3").runtimePatch).toBe(performance);
  });
});

const RECORD = 118;
const TRACK_NEXT = 102;
const TRACK_PREV = 103;

function arm(
  surface: LaunchControlXL3Surface,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const shifted = press(surface, runtimePatch, SHIFT, 0);
  const armed = press(surface, shifted.runtimePatch, RECORD, 0);

  return release(surface, armed.runtimePatch, SHIFT, 0);
}

// A note played and released, as a keyboard does it.
function tap(
  surface: LaunchControlXL3Surface,
  runtimePatch: CompiledInstrumentEnginePatch,
  noteName: string,
  velocity = 100,
) {
  const down = play(surface, runtimePatch, noteName, velocity);

  return play(surface, down.runtimePatch, noteName, 0, false);
}

describe("LaunchControlXL3Surface step record", () => {
  it("Shift + Record arms step record at the first step and again leaves it", () => {
    const surface = new LaunchControlXL3Surface();
    const armed = arm(surface, createStepEditPatch());

    expect(armed.runtimePatch.runtime.navigation.stepRecord).toEqual({
      cursor: 0,
      written: false,
    });

    const left = arm(surface, armed.runtimePatch);

    expect(left.runtimePatch.runtime.navigation.stepRecord).toBeUndefined();
  });

  it("playing sixteen notes writes sixteen steps, and the next wraps around", () => {
    const surface = new LaunchControlXL3Surface();
    let result = arm(surface, createStepEditPatch());
    const notes = Array.from({ length: 17 }, (_, index) =>
      index % 2 === 0 ? "C3" : "G3",
    );

    notes.forEach((note, index) => {
      result = tap(surface, result.runtimePatch, note, 60 + index);
    });

    const steps = getSteps(result.runtimePatch);
    expect(steps.map((step) => step.active)).toEqual(
      Array.from({ length: 16 }, () => true),
    );
    // The seventeenth note landed on the first step again.
    expect(steps[0]?.notes).toEqual([{ note: "C3", velocity: 76 }]);
    expect(steps[1]?.notes).toEqual([{ note: "G3", velocity: 61 }]);
    expect(result.runtimePatch.runtime.navigation.stepRecord).toEqual({
      cursor: 1,
      written: false,
    });
  });

  it("a chord released together writes one step", () => {
    const surface = new LaunchControlXL3Surface();
    const armed = arm(surface, createStepEditPatch());
    const c = play(surface, armed.runtimePatch, "C3", 100);
    const e = play(surface, c.runtimePatch, "E3", 50);
    const g = play(surface, e.runtimePatch, "G3", 50);

    expect(g.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(0);

    const cUp = play(surface, g.runtimePatch, "C3", 0, false);
    const eUp = play(surface, cUp.runtimePatch, "E3", 0, false);

    expect(eUp.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(0);

    const gUp = play(surface, eUp.runtimePatch, "G3", 0, false);

    expect(gUp.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(1);
    expect(getSteps(gUp.runtimePatch)[0]?.notes).toEqual([
      { note: "C3", velocity: 100 },
      { note: "E3", velocity: 100 },
      { note: "G3", velocity: 100 },
    ]);
    expect(getSteps(gUp.runtimePatch)[1]?.active).toBe(false);
  });

  it("Track right rests, Track left goes back, and a step button moves the cursor", () => {
    const surface = new LaunchControlXL3Surface();
    const armed = arm(
      surface,
      createStepEditPatch({
        0: { active: true, notes: [{ note: "C3", velocity: 100 }] },
      }),
    );
    const rested = press(surface, armed.runtimePatch, TRACK_NEXT, 0);

    expect(rested.command.type).toBe("seqEdit.update");
    expect(getSteps(rested.runtimePatch)[0]).toMatchObject({
      active: false,
      notes: [{ note: "C3", velocity: 100 }],
    });
    expect(rested.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(1);

    const back = press(surface, rested.runtimePatch, TRACK_PREV, 0);

    expect(back.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(0);
    expect(back.runtimePatch.runtime.navigation.activeTrackIndex).toBe(0);

    const moved = press(surface, back.runtimePatch, STEP_7, 0);

    expect(moved.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(6);
    expect(moved.runtimePatch.runtime.navigation.heldSteps).toEqual([]);

    const released = release(surface, moved.runtimePatch, STEP_7, 100);

    expect(released.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(6);
    expect(getSteps(released.runtimePatch)[6]?.active).toBe(false);
  });

  it("re-entering a note keeps the step's other settings", () => {
    const surface = new LaunchControlXL3Surface();
    const armed = arm(
      surface,
      createStepEditPatch({
        0: {
          active: true,
          notes: [{ note: "C3", velocity: 100 }],
          probability: 40,
          duration: "1/4",
        },
      }),
    );
    const written = tap(surface, armed.runtimePatch, "A3", 90);

    expect(getSteps(written.runtimePatch)[0]).toMatchObject({
      notes: [{ note: "A3", velocity: 90 }],
      probability: 40,
      duration: "1/4",
    });
  });

  it("crossing a bar moves to the next one in the loop and writes it as the active page", () => {
    const surface = new LaunchControlXL3Surface();
    const twoBars = createStepEditPatch();
    const grown = turn(surface, twoBars, LOOP_LENGTH, 1);
    let result = arm(surface, grown.runtimePatch);
    result = press(surface, result.runtimePatch, STEP_7 + 9, 0);

    expect(result.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(15);

    result = tap(surface, result.runtimePatch, "D3");

    expect(result.runtimePatch.runtime.navigation.sequencerPageIndex).toBe(1);
    expect(result.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(0);
    if (result.command.type !== "seqEdit.update") {
      throw new Error("Expected the bar change to reach the sequencer");
    }
    expect(result.command.update?.changes.props).toMatchObject({
      activePageNo: 1,
    });

    // Back from the first step of bar 2 lands on the last step of bar 1.
    const back = press(surface, result.runtimePatch, TRACK_PREV, 0);

    expect(back.runtimePatch.runtime.navigation.sequencerPageIndex).toBe(0);
    expect(back.runtimePatch.runtime.navigation.stepRecord?.cursor).toBe(15);
  });

  it("lights the cursor like a held step", () => {
    const surface = new LaunchControlXL3Surface();
    const armed = arm(surface, createStepEditPatch());
    const moved = press(surface, armed.runtimePatch, STEP_5, 0);

    expect(getStepStates(moved.runtimePatch)[4]).toBe("held");
    expect(getStepStates(moved.runtimePatch)[0]).toBe("off");
  });
});

const PLAY = 116;

describe("LaunchControlXL3Surface real-time record", () => {
  function armLive(
    surface: LaunchControlXL3Surface,
    runtimePatch: CompiledInstrumentEnginePatch,
  ) {
    const shifted = press(surface, runtimePatch, SHIFT, 0);
    const toggled = press(surface, shifted.runtimePatch, PLAY, 0);
    const released = release(surface, toggled.runtimePatch, SHIFT, 0);

    return { command: toggled.command, runtimePatch: released.runtimePatch };
  }

  it("Shift + Play arms in performance mode and again disarms", () => {
    const surface = new LaunchControlXL3Surface();
    const performance = createInstrumentEnginePatch(createStepEditDocument());
    const armed = armLive(surface, performance);

    expect(armed.command).toEqual({ type: "liveRecord.toggle", enabled: true });
    expect(armed.runtimePatch.runtime.navigation.liveRecord).toEqual({
      erasing: false,
    });

    const disarmed = armLive(surface, armed.runtimePatch);

    expect(disarmed.command).toEqual({
      type: "liveRecord.toggle",
      enabled: false,
    });
    expect(disarmed.runtimePatch.runtime.navigation.liveRecord).toBeUndefined();
  });

  it("holding Shift + Page Down while recording erases, and letting go of either stops", () => {
    const surface = new LaunchControlXL3Surface();
    const armed = armLive(surface, createStepEditPatch());
    const shifted = press(surface, armed.runtimePatch, SHIFT, 0);
    const erasing = press(surface, shifted.runtimePatch, PAGE_DOWN, 0);

    // The bar copy that shares the combo stays out of it.
    expect(erasing.command).toEqual({ type: "none" });
    expect(erasing.runtimePatch.runtime.navigation.liveRecord).toEqual({
      erasing: true,
    });

    const lifted = release(surface, erasing.runtimePatch, PAGE_DOWN, 0);

    expect(lifted.runtimePatch.runtime.navigation.liveRecord).toEqual({
      erasing: false,
    });

    const again = press(surface, lifted.runtimePatch, PAGE_DOWN, 0);
    const unshifted = release(surface, again.runtimePatch, SHIFT, 0);

    expect(unshifted.runtimePatch.runtime.navigation.liveRecord).toEqual({
      erasing: false,
    });
  });

  it("step record and real-time record never run together", () => {
    const surface = new LaunchControlXL3Surface();
    const live = armLive(surface, createStepEditPatch());
    const step = arm(surface, live.runtimePatch);

    expect(step.runtimePatch.runtime.navigation.stepRecord).toBeDefined();
    expect(step.runtimePatch.runtime.navigation.liveRecord).toBeUndefined();

    const liveAgain = armLive(surface, step.runtimePatch);

    expect(liveAgain.runtimePatch.runtime.navigation.liveRecord).toBeDefined();
    expect(
      liveAgain.runtimePatch.runtime.navigation.stepRecord,
    ).toBeUndefined();
  });

  it("only a track with a step sequencer can record", () => {
    const surface = new LaunchControlXL3Surface();
    const document = createStepEditDocument();
    document.tracks[0] = { ...document.tracks[0]!, noteSource: "externalMidi" };
    const runtimePatch = createInstrumentEnginePatch(document);
    const attempt = armLive(surface, runtimePatch);

    expect(attempt.command).toEqual({ type: "none" });
    expect(attempt.runtimePatch.runtime.navigation.liveRecord).toBeUndefined();
  });
});
