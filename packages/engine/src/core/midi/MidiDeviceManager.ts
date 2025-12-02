import { Context } from "@blibliki/utils";
import ComputerKeyboardDevice from "./ComputerKeyboardDevice";
import MidiDevice from "./MidiDevice";
import { createMidiAdapter, type IMidiAccess } from "./adapters";

type ListenerCallback = (device: MidiDevice) => void;

export default class MidiDeviceManager {
  devices = new Map<string, MidiDevice | ComputerKeyboardDevice>();
  private initialized = false;
  private listeners: ListenerCallback[] = [];
  private context: Readonly<Context>;
  private midiAccess: IMidiAccess | null = null;
  private adapter = createMidiAdapter();

  constructor(context: Context) {
    this.context = context;
    this.addComputerKeyboard();
  }

  async initialize() {
    await this.initializeDevices();

    this.listenChanges();
    this.initialized = true;
  }

  find(id: string): MidiDevice | ComputerKeyboardDevice | undefined {
    return this.devices.get(id);
  }

  findByName(name: string): MidiDevice | ComputerKeyboardDevice | undefined {
    return Array.from(this.devices.values()).find((d) => d.name === name);
  }

  addListener(callback: ListenerCallback) {
    this.listeners.push(callback);
  }

  private async initializeDevices() {
    if (this.initialized) return;

    try {
      if (!this.adapter.isSupported()) {
        console.warn("MIDI is not supported on this platform");
        return;
      }

      this.midiAccess = await this.adapter.requestMIDIAccess();

      if (!this.midiAccess) {
        console.error("Failed to get MIDI access");
        return;
      }

      for (const input of this.midiAccess.inputs()) {
        if (!this.devices.has(input.id)) {
          this.devices.set(input.id, new MidiDevice(input, this.context));
        }
      }
    } catch (err) {
      console.error("Error enabling MIDI:", err);
    }
  }

  private addComputerKeyboard() {
    if (typeof document === "undefined") return;

    const computerKeyboardDevice = new ComputerKeyboardDevice(this.context);
    this.devices.set(computerKeyboardDevice.id, computerKeyboardDevice);
  }

  private listenChanges() {
    if (!this.midiAccess) return;

    this.midiAccess.addEventListener("statechange", (port) => {
      if (port.state === "connected") {
        // Device connected
        if (this.devices.has(port.id)) return;

        const device = new MidiDevice(port, this.context);
        this.devices.set(device.id, device);

        this.listeners.forEach((listener) => {
          listener(device);
        });
      } else {
        // Device disconnected
        const device = this.devices.get(port.id);
        if (!device) return;
        if (device instanceof ComputerKeyboardDevice) return;

        device.disconnect();
        this.devices.delete(device.id);

        this.listeners.forEach((listener) => {
          listener(device);
        });
      }
    });
  }
}
