import { describe, expect, it, vi } from "vitest";
import { MidiPortState } from "@/core/midi/BaseMidiDevice";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import MidiOutput from "@/modules/MidiOutput";

type FakeOutputDevice = {
  id: string;
  name: string;
  state: MidiPortState;
  send: ReturnType<typeof vi.fn>;
};

function createFakeOutputDevice(id: string, name: string): FakeOutputDevice {
  return {
    id,
    name,
    state: MidiPortState.connected,
    send: vi.fn(),
  };
}

describe("MidiOutput", () => {
  it("persists the matched output device id when selected by name", (ctx) => {
    const dawController = createFakeOutputDevice(
      "lcxl3-daw-out-1",
      "LCXL3 1 DAW OUT",
    );

    ctx.engine.midiDeviceManager.outputDevices.clear();
    ctx.engine.midiDeviceManager.outputDevices.set(
      dawController.id,
      dawController as never,
    );

    const serialized = ctx.engine.addModule({
      name: "Controller Out",
      moduleType: ModuleType.MidiOutput,
      props: {
        selectedName: "LCXL3 DAW Out",
      },
    });

    const module = ctx.engine.findModule(serialized.id) as MidiOutput;

    expect(module.props.selectedId).toBe("lcxl3-daw-out-1");
    expect(module.props.selectedName).toBe("LCXL3 1 DAW OUT");

    module.onMidiEvent(MidiEvent.fromCC(21, 64, ctx.context.currentTime));
    expect(dawController.send).toHaveBeenCalledWith(expect.any(Uint8Array));
  });
});
