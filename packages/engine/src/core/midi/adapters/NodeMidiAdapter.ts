/**
 * node-midi adapter for Node.js
 */
import { isNode } from "es-toolkit";
import type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
  IMidiOutputPort,
  IMidiPort,
  MidiMessageCallback,
} from "./types";

// Dynamic import type for node-midi
type NodeMidiInput = {
  getPortCount(): number;
  getPortName(port: number): string;
  openPort(port: number): void;
  closePort(): void;
  on(
    event: "message",
    callback: (deltaTime: number, message: number[]) => void,
  ): void;
  off(
    event: "message",
    callback: (deltaTime: number, message: number[]) => void,
  ): void;
  isPortOpen(): boolean;
};

type NodeMidiOutput = {
  getPortCount(): number;
  getPortName(port: number): string;
  openPort(port: number): void;
  closePort(): void;
  sendMessage(message: number[]): void;
  isPortOpen(): boolean;
};

type NodeMidiModule = {
  Input: new () => NodeMidiInput;
  Output: new () => NodeMidiOutput;
};

class NodeMidiInputPort implements IMidiInputPort {
  readonly id: string;
  readonly name: string;
  private portIndex: number;
  private input: NodeMidiInput;
  private callbacks = new Set<MidiMessageCallback>();
  private handler: ((deltaTime: number, message: number[]) => void) | null =
    null;
  private _state: "connected" | "disconnected" = "disconnected";

  constructor(portIndex: number, name: string, input: NodeMidiInput) {
    this.portIndex = portIndex;
    this.id = `node-midi-${portIndex}`;
    this.name = name;
    this.input = input;
  }

  get state(): "connected" | "disconnected" {
    return this._state;
  }

  get type() {
    return "input" as const;
  }

  addEventListener(callback: MidiMessageCallback): void {
    if (this.callbacks.size === 0) {
      this.handler = (_deltaTime: number, message: number[]) => {
        const event = {
          data: new Uint8Array(message),
          timeStamp: performance.now(),
        };

        this.callbacks.forEach((cb) => {
          cb(event);
        });
      };

      try {
        if (!this.input.isPortOpen()) {
          this.input.openPort(this.portIndex);
          this._state = "connected";
        }
        this.input.on("message", this.handler);
      } catch (err) {
        console.error(`Error opening MIDI port ${this.portIndex}:`, err);
      }
    }
    this.callbacks.add(callback);
  }

  removeEventListener(callback: MidiMessageCallback): void {
    this.callbacks.delete(callback);

    if (this.callbacks.size === 0 && this.handler) {
      try {
        this.input.off("message", this.handler);
        if (this.input.isPortOpen()) {
          this.input.closePort();
          this._state = "disconnected";
        }
      } catch (err) {
        console.error(`Error closing MIDI port ${this.portIndex}:`, err);
      }
      this.handler = null;
    }
  }
}

class NodeMidiOutputPort implements IMidiOutputPort {
  readonly id: string;
  readonly name: string;
  private portIndex: number;
  private output: NodeMidiOutput;
  private _state: "connected" | "disconnected" = "disconnected";
  private isOpen = false;

  constructor(portIndex: number, name: string, output: NodeMidiOutput) {
    this.portIndex = portIndex;
    this.id = `node-midi-out-${portIndex}`;
    this.name = name;
    this.output = output;
  }

  get state(): "connected" | "disconnected" {
    return this._state;
  }

  get type() {
    return "output" as const;
  }

  private ensureOpen(): void {
    if (!this.isOpen) {
      try {
        this.output.openPort(this.portIndex);
        this.isOpen = true;
        this._state = "connected";
      } catch (err) {
        console.error(`Error opening MIDI output port ${this.portIndex}:`, err);
      }
    }
  }

  send(data: number[] | Uint8Array, _timestamp?: number): void {
    this.ensureOpen();
    try {
      const message = Array.isArray(data) ? data : Array.from(data);
      this.output.sendMessage(message);
    } catch (err) {
      console.error(`Error sending MIDI message:`, err);
    }
  }
}

class NodeMidiAccess implements IMidiAccess {
  private inputPorts = new Map<string, NodeMidiInputPort>();
  private outputPorts = new Map<string, NodeMidiOutputPort>();
  private MidiModule: NodeMidiModule;

  constructor(MidiModule: NodeMidiModule) {
    this.MidiModule = MidiModule;
    this.scanPorts();
  }

  private scanPorts(): void {
    // Scan input ports
    try {
      const input = new this.MidiModule.Input();
      const inputCount = input.getPortCount();

      for (let i = 0; i < inputCount; i++) {
        const portName = input.getPortName(i);
        const id = `node-midi-${i}`;

        if (!this.inputPorts.has(id)) {
          const portInput = new this.MidiModule.Input();
          const port = new NodeMidiInputPort(i, portName, portInput);
          this.inputPorts.set(id, port);
        }
      }

      if (input.isPortOpen()) {
        input.closePort();
      }
    } catch (err) {
      console.error("Error scanning MIDI input ports:", err);
    }

    // Scan output ports
    try {
      const output = new this.MidiModule.Output();
      const outputCount = output.getPortCount();

      for (let i = 0; i < outputCount; i++) {
        const portName = output.getPortName(i);
        const id = `node-midi-out-${i}`;

        if (!this.outputPorts.has(id)) {
          const portOutput = new this.MidiModule.Output();
          const port = new NodeMidiOutputPort(i, portName, portOutput);
          this.outputPorts.set(id, port);
        }
      }

      if (output.isPortOpen()) {
        output.closePort();
      }
    } catch (err) {
      console.error("Error scanning MIDI output ports:", err);
    }
  }

  *inputs(): IterableIterator<IMidiInputPort> {
    for (const [, port] of this.inputPorts) {
      yield port;
    }
  }

  *outputs(): IterableIterator<IMidiOutputPort> {
    for (const [, port] of this.outputPorts) {
      yield port;
    }
  }

  addEventListener(
    _event: "statechange",
    _callback: (port: IMidiPort) => void,
  ): void {
    // node-midi doesn't support hot-plugging detection
    console.warn(
      "Hot-plug detection not supported with node-midi adapter. Restart required for new devices.",
    );
  }
}

export default class NodeMidiAdapter implements IMidiAdapter {
  async requestMIDIAccess(): Promise<IMidiAccess | null> {
    try {
      // Dynamic import to avoid bundling in browser builds
      const midi = (await import("@julusian/midi")) as
        | NodeMidiModule
        | { default: NodeMidiModule };
      const midiModule = "default" in midi ? midi.default : midi;
      return new NodeMidiAccess(midiModule);
    } catch (err) {
      console.error("Error loading node-midi:", err);
      return null;
    }
  }

  isSupported(): boolean {
    // Check if we're in Node.js environment
    return isNode();
  }
}
