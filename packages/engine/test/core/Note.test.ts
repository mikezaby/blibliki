import { describe, expect, it } from "vitest";
import Note from "@/core/Note";
import Message from "@/core/midi/Message";

describe("Note", () => {
  it("encodes normalized velocity as a MIDI velocity byte", () => {
    expect(new Note({ name: "C", octave: 3, velocity: 0 }).midiData()[2]).toBe(
      0,
    );
    expect(new Note({ name: "C", octave: 3, velocity: 1 }).midiData()[2]).toBe(
      127,
    );
    expect(
      new Note({ name: "C", octave: 3, velocity: 0.2 }).midiData()[2],
    ).toBe(25);
  });

  it("preserves velocity when decoding a MIDI note event", () => {
    const note = Note.fromEvent(new Message(new Uint8Array([0x90, 60, 64])));

    expect(note.fullName).toBe("C3");
    expect(note.velocity).toBeCloseTo(64 / 127, 5);
  });
});
