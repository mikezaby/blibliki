import { describe, expect, it } from "vitest";
import { MidiNoteEvent } from "@/core/Module";
import { createModule, VideoModuleType } from "@/modules";

const values = new Map<string, number>();

function midiNotes(instances = 2) {
  return createModule({
    name: "notes",
    moduleType: VideoModuleType.MidiNotes,
    props: { instances },
  });
}

const on = (note: number, instance?: number, velocity = 1): MidiNoteEvent => ({
  type: "noteOn",
  note,
  velocity,
  instance,
});
const off = (note: number, instance?: number): MidiNoteEvent => ({
  type: "noteOff",
  note,
  velocity: 0,
  instance,
});

function state(module: ReturnType<typeof midiNotes>, instances = 2) {
  return Array.from({ length: instances }, (_, instance) =>
    module.tick(values, { now: 0, dt: 0 }, undefined, instance),
  );
}

describe("MidiNotes", () => {
  it("turns each instance's tagged notes into gate, note and velocity", () => {
    const notes = midiNotes();
    notes.receiveMidi("in", on(60, 0, 0.5));
    notes.receiveMidi("in", on(62, 1));

    expect(state(notes)).toEqual([
      { gate: 1, note: 60, velocity: 0.5 },
      { gate: 1, note: 62, velocity: 1 },
    ]);

    notes.receiveMidi("in", off(60, 0));

    expect(state(notes)).toEqual([
      { gate: 0, note: 60, velocity: 0.5 },
      { gate: 1, note: 62, velocity: 1 },
    ]);
  });

  it("puts an untagged note on instance 0 and drops one for an instance it lacks", () => {
    const notes = midiNotes();
    notes.receiveMidi("in", on(60));
    notes.receiveMidi("in", on(62, 5));

    expect(state(notes)).toEqual([
      { gate: 1, note: 60, velocity: 1 },
      { gate: 0, note: 0, velocity: 0 },
    ]);
  });

  it("ignores a note off for a note the instance is not holding", () => {
    const notes = midiNotes();
    notes.receiveMidi("in", on(60, 0));
    notes.receiveMidi("in", off(62, 0));

    expect(state(notes)[0]).toEqual({ gate: 1, note: 60, velocity: 1 });
  });
});
