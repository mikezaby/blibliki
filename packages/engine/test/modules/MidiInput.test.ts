import { describe, expect, it, vi } from "vitest";
import { MidiPortState } from "@/core/midi/BaseMidiDevice";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import MidiInput from "@/modules/MidiInput";

type FakeInputDevice = {
  id: string;
  name: string;
  state: MidiPortState;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function createFakeInputDevice(id: string, name: string): FakeInputDevice {
  return {
    id,
    name,
    state: MidiPortState.connected,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe("MidiInput", () => {
  it("persists the matched input device id when selected by name", (ctx) => {
    const dawController = createFakeInputDevice(
      "lcxl3-daw-1",
      "LCXL3 1 DAW IN",
    );

    ctx.engine.midiDeviceManager.inputDevices.clear();
    ctx.engine.midiDeviceManager.inputDevices.set(
      dawController.id,
      dawController as never,
    );

    const serialized = ctx.engine.addModule({
      name: "Controller In",
      moduleType: ModuleType.MidiInput,
      props: {
        selectedName: "LCXL3 DAW In",
      },
    });

    const module = ctx.engine.findModule(serialized.id) as MidiInput;

    expect(dawController.addEventListener).toHaveBeenCalledTimes(1);
    expect(module.props.selectedId).toBe("lcxl3-daw-1");
    expect(module.props.selectedName).toBe("LCXL3 1 DAW IN");
  });

  it("listens to all external inputs and excludes configured devices in all-ins mode", (ctx) => {
    const keyboard = createFakeInputDevice(
      "computer_keyboard",
      "Computer Keyboard",
    );
    const keyboardController = createFakeInputDevice(
      "keyboard-1",
      "KeyStep 37",
    );
    const padController = createFakeInputDevice("pads-1", "Launchpad X");
    const dawController = createFakeInputDevice("lcxl3-daw", "LCXL3 DAW In");

    ctx.engine.midiDeviceManager.inputDevices.clear();
    ctx.engine.midiDeviceManager.inputDevices.set(
      keyboard.id,
      keyboard as never,
    );
    ctx.engine.midiDeviceManager.inputDevices.set(
      keyboardController.id,
      keyboardController as never,
    );
    ctx.engine.midiDeviceManager.inputDevices.set(
      padController.id,
      padController as never,
    );
    ctx.engine.midiDeviceManager.inputDevices.set(
      dawController.id,
      dawController as never,
    );

    const serialized = ctx.engine.addModule({
      name: "All ins",
      moduleType: ModuleType.MidiInput,
      props: {
        allIns: true,
        selectedName: "All ins",
        excludedIds: ["computer_keyboard"],
        excludedNames: ["LCXL3 DAW In"],
      },
    });

    const module = ctx.engine.findModule(serialized.id) as MidiInput;

    expect(module.props.allIns).toBe(true);
    expect(keyboard.addEventListener).not.toHaveBeenCalled();
    expect(dawController.addEventListener).not.toHaveBeenCalled();
    expect(keyboardController.addEventListener).toHaveBeenCalledTimes(1);
    expect(padController.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("forwards midi events received from any attached device in all-ins mode", (ctx) => {
    const firstKeyboard = createFakeInputDevice("keyboard-1", "KeyStep 37");
    const secondKeyboard = createFakeInputDevice(
      "keyboard-2",
      "Hydrasynth Explorer",
    );

    ctx.engine.midiDeviceManager.inputDevices.clear();
    ctx.engine.midiDeviceManager.inputDevices.set(
      firstKeyboard.id,
      firstKeyboard as never,
    );
    ctx.engine.midiDeviceManager.inputDevices.set(
      secondKeyboard.id,
      secondKeyboard as never,
    );

    const serialized = ctx.engine.addModule({
      name: "All ins",
      moduleType: ModuleType.MidiInput,
      props: {
        allIns: true,
        selectedName: "All ins",
      },
    });

    const module = ctx.engine.findModule(serialized.id) as MidiInput;
    const midiOut = module.outputs.findByName("midi out") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };
    const forwardedEvents: MidiEvent[] = [];
    const originalOnMidiEvent = midiOut.onMidiEvent.bind(midiOut);

    midiOut.onMidiEvent = (event: MidiEvent) => {
      forwardedEvents.push(event);
      originalOnMidiEvent(event);
    };

    const firstListener = firstKeyboard.addEventListener.mock.calls[0]?.[0] as
      | ((event: MidiEvent) => void)
      | undefined;
    const secondListener = secondKeyboard.addEventListener.mock
      .calls[0]?.[0] as ((event: MidiEvent) => void) | undefined;

    expect(firstListener).toBeDefined();
    expect(secondListener).toBeDefined();

    firstListener?.(MidiEvent.fromNote("C3", true, ctx.context.currentTime));
    secondListener?.(MidiEvent.fromNote("E3", true, ctx.context.currentTime));

    expect(forwardedEvents).toHaveLength(2);
    expect(forwardedEvents[0]?.note?.midiNumber).toBe(60);
    expect(forwardedEvents[1]?.note?.midiNumber).toBe(64);
  });

  it("attaches the selected input when the device appears after module creation", (ctx) => {
    const listeners: Array<(device: FakeInputDevice) => void> = [];
    vi.spyOn(ctx.engine.midiDeviceManager, "addListener").mockImplementation(
      (callback) => {
        listeners.push(
          callback as unknown as (device: FakeInputDevice) => void,
        );
        return () => {};
      },
    );

    ctx.engine.midiDeviceManager.inputDevices.clear();

    const serialized = ctx.engine.addModule({
      name: "Late Input",
      moduleType: ModuleType.MidiInput,
      props: {
        selectedName: "KeyStep 37",
      },
    });

    const module = ctx.engine.findModule(serialized.id) as MidiInput;
    const lateDevice = createFakeInputDevice("keystep-1", "KeyStep 37");

    ctx.engine.midiDeviceManager.inputDevices.set(
      lateDevice.id,
      lateDevice as never,
    );
    listeners.forEach((listener) => {
      listener(lateDevice);
    });

    expect(lateDevice.addEventListener).toHaveBeenCalledTimes(1);
    expect(module.props.selectedId).toBe("keystep-1");
    expect(module.props.selectedName).toBe("KeyStep 37");
  });
});
