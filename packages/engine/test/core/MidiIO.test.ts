import { describe, expect, it, vi } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import MidiInput from "@/modules/MidiInput";

describe("MidiOutput.listen", () => {
  it("observes events without a route until unsubscribed", (ctx) => {
    const serialized = ctx.engine.addModule({
      name: "in",
      moduleType: ModuleType.MidiInput,
      props: {},
    });
    const module = ctx.engine.findModule(serialized.id) as MidiInput;
    const listener = vi.fn();
    const event = MidiEvent.fromNote("C3", true, 0);

    const stop = module.midiOutput.listen(listener);
    module.sendMidi(event);

    expect(listener).toHaveBeenCalledWith(event);

    stop();
    module.sendMidi(event);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
