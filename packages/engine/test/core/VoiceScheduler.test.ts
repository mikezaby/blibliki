import { afterEach, describe, expect, it, vi } from "vitest";
import { Engine } from "@/Engine";
import MidiEvent, { MidiEventType } from "@/core/midi/MidiEvent";
import VoiceScheduler, { VoiceAllocation } from "@/core/module/VoiceScheduler";
import { ModuleType } from "@/modules";

const microtask = () => new Promise<void>((resolve) => queueMicrotask(resolve));

// Four voices; returns the voice each note on lands in, in order.
async function scheduler(engine: Engine, allocation: VoiceAllocation) {
  const serialized = engine.addModule({
    name: "sched",
    moduleType: ModuleType.VoiceScheduler,
    props: { allocation },
  });
  await microtask();
  const module = engine.findModule(serialized.id) as VoiceScheduler;
  module.voices = 4;
  const voices: (number | undefined)[] = [];
  module.midiOutput.listen((event) => {
    if (event.type === MidiEventType.noteOn) voices.push(event.voiceNo);
  });
  const play = (name: string, on = true) => {
    module.onMidiEvent(MidiEvent.fromNote(name, on, 0));
  };

  return { play, voices };
}

describe("VoiceScheduler allocation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills the lowest free voice by default", async (ctx) => {
    const { play, voices } = await scheduler(ctx.engine, "lowest");
    play("C3");
    play("D3");
    play("C3", false);
    play("E3");

    expect(voices).toEqual([0, 1, 0]);
  });

  it("picks any free voice at random when asked, and keeps a sounding note's voice", async (ctx) => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const { play, voices } = await scheduler(ctx.engine, "random");
    play("C3");
    play("D3");
    play("C3");

    expect(voices).toEqual([3, 2, 3]);
  });
});
