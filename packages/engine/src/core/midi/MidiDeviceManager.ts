import { Context } from "@blibliki/utils";
import { Input, Output, WebMidi } from "webmidi";
import ComputerKeyboardDevice from "./ComputerKeyboardDevice";
import MidiDevice from "./MidiDevice";

type ListenerCallback = (device: MidiDevice) => void;

export default class MidiDeviceManager {
  devices = new Map<string, MidiDevice | ComputerKeyboardDevice>();
  private initialized = false;
  private listeners: ListenerCallback[] = [];
  private context: Readonly<Context>;

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
      await WebMidi.enable();

      WebMidi.inputs.forEach((input) => {
        if (!this.devices.has(input.id)) {
          this.devices.set(input.id, new MidiDevice(input, this.context));
        }
      });
    } catch (err) {
      console.error("Error enabling WebMidi:", err);
    }
  }

  private addComputerKeyboard() {
    if (typeof document === "undefined") return;

    const computerKeyboardDevice = new ComputerKeyboardDevice(this.context);
    this.devices.set(computerKeyboardDevice.id, computerKeyboardDevice);
  }

  private listenChanges() {
    WebMidi.addListener("connected", (event) => {
      const port = event.port as Input | Output;
      if (port instanceof Output) return;

      if (this.devices.has(port.id)) return;

      const device = new MidiDevice(port, this.context);
      this.devices.set(device.id, device);

      this.listeners.forEach((listener) => {
        listener(device);
      });
    });

    WebMidi.addListener("disconnected", (event) => {
      const port = event.port as Input | Output;
      if (port instanceof Output) return;

      const device = this.devices.get(port.id);
      if (!device) return;
      if (device instanceof ComputerKeyboardDevice) return;

      device.disconnect();
      this.devices.delete(device.id);

      this.listeners.forEach((listener) => {
        listener(device);
      });
    });
  }
}
