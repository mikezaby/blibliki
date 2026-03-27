import { describe, expect, it } from "vitest";
import Message from "@/core/midi/Message";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import MidiChannelFilter from "@/modules/MidiChannelFilter";

const createNoteOn = (
  channel: number,
  noteNumber: number,
  velocity: number,
  triggeredAt: number,
) =>
  new MidiEvent(
    new Message(new Uint8Array([0x90 | channel, noteNumber, velocity])),
    triggeredAt,
  );

describe("MidiChannelFilter", () => {
  it("forwards midi events when the configured channel matches", (ctx) => {
    const serializedFilter = ctx.engine.addModule({
      name: "Channel Filter",
      moduleType: ModuleType.MidiChannelFilter,
      props: { channel: 2 },
    });

    const filter = ctx.engine.findModule(
      serializedFilter.id,
    ) as MidiChannelFilter;
    const midiOut = filter.outputs.findByName("midi out") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };
    const sentEvents: MidiEvent[] = [];
    const originalOnMidiEvent = midiOut.onMidiEvent.bind(midiOut);

    midiOut.onMidiEvent = (event: MidiEvent) => {
      sentEvents.push(event);
      originalOnMidiEvent(event);
    };

    const midiIn = filter.inputs.findByName("midi in") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };

    midiIn.onMidiEvent(createNoteOn(1, 60, 100, ctx.context.currentTime));

    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]?.channel).toBe(1);
    expect(sentEvents[0]?.note?.midiNumber).toBe(60);
  });

  it("drops midi events when the configured channel does not match", (ctx) => {
    const serializedFilter = ctx.engine.addModule({
      name: "Channel Filter",
      moduleType: ModuleType.MidiChannelFilter,
      props: { channel: 2 },
    });

    const filter = ctx.engine.findModule(
      serializedFilter.id,
    ) as MidiChannelFilter;
    const midiOut = filter.outputs.findByName("midi out") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };
    const sentEvents: MidiEvent[] = [];
    const originalOnMidiEvent = midiOut.onMidiEvent.bind(midiOut);

    midiOut.onMidiEvent = (event: MidiEvent) => {
      sentEvents.push(event);
      originalOnMidiEvent(event);
    };

    const midiIn = filter.inputs.findByName("midi in") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };

    midiIn.onMidiEvent(createNoteOn(0, 60, 100, ctx.context.currentTime));

    expect(sentEvents).toHaveLength(0);
  });
});
