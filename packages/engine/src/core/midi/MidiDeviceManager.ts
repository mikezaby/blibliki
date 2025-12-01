import { Context } from "@blibliki/utils";
import ComputerKeyboardDevice from "./ComputerKeyboardDevice";
import MidiDevice from "./MidiDevice";

type ListenerCallback = (device: MidiDevice) => void;

export default class MidiDeviceManager {
  devices = new Map<string, MidiDevice | ComputerKeyboardDevice>();
  private initialized = false;
  private listeners: ListenerCallback[] = [];
  private context: Readonly<Context>;
  private midiAccess: MIDIAccess | null = null;

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
      this.midiAccess = await navigator.requestMIDIAccess();

      this.midiAccess.inputs.forEach((input) => {
        if (!this.devices.has(input.id)) {
          this.devices.set(input.id, new MidiDevice(input, this.context));
        }
      });
    } catch (err) {
      console.error("Error enabling Web MIDI API:", err);
    }
  }

  private addComputerKeyboard() {
    if (typeof document === "undefined") return;

    const computerKeyboardDevice = new ComputerKeyboardDevice(this.context);
    this.devices.set(computerKeyboardDevice.id, computerKeyboardDevice);
  }

  private listenChanges() {
    if (!this.midiAccess) return;

    this.midiAccess.addEventListener("statechange", (event) => {
      const port = event.port;
      if (!port) return;

      // Only handle input devices
      if (port.type !== "input") return;

      const input = port as MIDIInput;

      if (input.state === "connected") {
        // Device connected
        if (this.devices.has(input.id)) return;

        const device = new MidiDevice(input, this.context);
        this.devices.set(device.id, device);

        this.listeners.forEach((listener) => {
          listener(device);
        });
      } else if (input.state === "disconnected") {
        // Device disconnected
        const device = this.devices.get(input.id);
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
