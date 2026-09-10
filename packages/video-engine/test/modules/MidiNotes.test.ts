import { describe, expect, it } from "vitest";
import { MidiNoteEvent } from "@/core/Module";
import { createModule, VideoModuleType } from "@/modules";

const values = new Map<string, number>();

function midiNotes(instances = 2) {
  return createModule({
    name: "mv",
    moduleType: VideoModuleType.MidiNotes,
    props: { moduleId: "kb", instances },
  });
}

const on = (note: number, velocity = 1): MidiNoteEvent => ({
  type: "noteOn",
  note,
  velocity,
});
const off = (note: number): MidiNoteEvent => ({
  type: "noteOff",
  note,
  velocity: 0,
});

function state(module: ReturnType<typeof midiNotes>, instances = 2) {
  return Array.from({ length: instances }, (_, instance) =>
    module.tick(values, { now: 0, dt: 0 }, undefined, instance),
  );
}

describe("MidiNotes", () => {
  it("fills free instances in order and releases the instance holding the note", () => {
    const mv = midiNotes();
    mv.onMidi("kb", on(60, 0.5));
    mv.onMidi("kb", on(62));

    expect(state(mv)).toEqual([
      { gate: 1, note: 60, velocity: 0.5 },
      { gate: 1, note: 62, velocity: 1 },
    ]);

    mv.onMidi("kb", off(60));

    expect(state(mv)).toEqual([
      { gate: 0, note: 60, velocity: 0.5 },
      { gate: 1, note: 62, velocity: 1 },
    ]);
  });

  it("reuses a released instance before stealing, then steals the earliest", () => {
    const mv = midiNotes();
    mv.onMidi("kb", on(60));
    mv.onMidi("kb", on(62));
    mv.onMidi("kb", off(60));
    mv.onMidi("kb", on(64));

    expect(state(mv).map((v) => v?.note)).toEqual([64, 62]);

    mv.onMidi("kb", on(65));

    expect(state(mv).map((v) => v?.note)).toEqual([64, 65]);
  });

  it("retriggers the instance already holding the note", () => {
    const mv = midiNotes();
    mv.onMidi("kb", on(60, 0.2));
    mv.onMidi("kb", on(60, 0.9));

    expect(state(mv)).toEqual([
      { gate: 1, note: 60, velocity: 0.9 },
      { gate: 0, note: 0, velocity: 0 },
    ]);
  });

  it("ignores notes from other audio modules and note offs it never held", () => {
    const mv = midiNotes();
    mv.onMidi("other", on(60));
    mv.onMidi("kb", off(60));

    expect(state(mv)).toEqual([
      { gate: 0, note: 0, velocity: 0 },
      { gate: 0, note: 0, velocity: 0 },
    ]);
  });

  it("allocates within the current instance count", () => {
    const mv = midiNotes(3);
    mv.onMidi("kb", on(60));
    mv.onMidi("kb", on(62));
    mv.onMidi("kb", on(64));
    mv.updateProps({ instances: 2 });
    mv.onMidi("kb", on(65));

    expect(state(mv, 3).map((v) => v?.note)).toEqual([65, 62, 0]);
  });
});
