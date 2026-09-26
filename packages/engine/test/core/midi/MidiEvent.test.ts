import { describe, expect, it } from "vitest";
import MidiEvent, { MidiEventType } from "@/core/midi/MidiEvent";

describe("MidiEvent.fromNote", () => {
  it("sends on channel 1 unless told otherwise", () => {
    const event = MidiEvent.fromNote("C3", true, 0);

    expect(event.channel).toBe(0);
    expect(event.type).toBe(MidiEventType.noteOn);
    expect(event.note?.fullName).toBe("C3");
  });

  it("puts the note on the channel asked for, on and off", () => {
    const on = MidiEvent.fromNote("D#4", true, 0, 9);
    const off = MidiEvent.fromNote("D#4", false, 0, 9);

    expect(on.channel).toBe(9);
    expect(on.type).toBe(MidiEventType.noteOn);
    expect(off.channel).toBe(9);
    expect(off.type).toBe(MidiEventType.noteOff);
    expect(off.note?.fullName).toBe("D#4");
  });
});
