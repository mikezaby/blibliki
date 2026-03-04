import { describe, expect, it, vi } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import { ModuleType } from "@/modules";
import MidiOutput from "@/modules/MidiOutput";

class FakeOutputPort {
  readonly type = "output" as const;
  send = vi.fn();

  constructor(
    readonly id: string,
    readonly name: string,
    public state: "connected" | "disconnected" = "connected",
  ) {}
}

describe("MidiOutput", () => {
  it("does not send to a disconnected cached output device", (ctx) => {
    const port = new FakeOutputPort("out-1", "LoopMIDI");
    const outputDevice = new MidiOutputDevice(port);
    ctx.engine.midiDeviceManager.outputDevices.set(
      outputDevice.id,
      outputDevice,
    );

    const midiOutputSerialized = ctx.engine.addModule({
      name: "MIDI Out",
      moduleType: ModuleType.MidiOutput,
      props: {
        selectedId: outputDevice.id,
        selectedName: outputDevice.name,
      },
    });
    const midiOutput = ctx.engine.findModule(
      midiOutputSerialized.id,
    ) as MidiOutput;

    port.state = "disconnected";
    ctx.engine.midiDeviceManager.outputDevices.delete(outputDevice.id);

    midiOutput.onMidiEvent(MidiEvent.fromCC(13, 64, ctx.context.currentTime));

    expect(port.send).not.toHaveBeenCalled();
  });

  it("reacquires by selectedName after output id changes on reconnect", (ctx) => {
    const portA = new FakeOutputPort("out-1", "Launch Control XL 3 DAW");
    const deviceA = new MidiOutputDevice(portA);
    ctx.engine.midiDeviceManager.outputDevices.set(deviceA.id, deviceA);

    const midiOutputSerialized = ctx.engine.addModule({
      name: "MIDI Out",
      moduleType: ModuleType.MidiOutput,
      props: {
        selectedId: deviceA.id,
        selectedName: deviceA.name,
      },
    });
    const midiOutput = ctx.engine.findModule(
      midiOutputSerialized.id,
    ) as MidiOutput;

    portA.state = "disconnected";
    ctx.engine.midiDeviceManager.outputDevices.delete(deviceA.id);

    const portB = new FakeOutputPort("out-9", "Launch Control XL 3 DAW");
    const deviceB = new MidiOutputDevice(portB);
    ctx.engine.midiDeviceManager.outputDevices.set(deviceB.id, deviceB);

    midiOutput.onMidiEvent(MidiEvent.fromCC(13, 64, ctx.context.currentTime));

    expect(portA.send).not.toHaveBeenCalled();
    expect(portB.send).toHaveBeenCalledWith(
      MidiEvent.fromCC(13, 64, ctx.context.currentTime).rawMessage.data,
      undefined,
    );
  });
});
