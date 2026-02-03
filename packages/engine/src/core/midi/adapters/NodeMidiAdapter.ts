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

const HOT_PLUG_POLL_INTERVAL_MS = 1000;

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
  private portIndex: number;
  private nameValue: string;
  private input: NodeMidiInput;
  private callbacks = new Set<MidiMessageCallback>();
  private handler: ((deltaTime: number, message: number[]) => void) | null =
    null;
  private _state: "connected" | "disconnected" = "disconnected";

  constructor(portIndex: number, name: string, input: NodeMidiInput) {
    this.portIndex = portIndex;
    this.nameValue = name;
    this.input = input;
  }

  get id(): string {
    return `${this.nameValue}:${this.portIndex}`;
  }

  get name(): string {
    return this.nameValue;
  }

  get state(): "connected" | "disconnected" {
    return this._state;
  }

  get type() {
    return "input" as const;
  }

  setConnected(): void {
    this._state = "connected";
  }

  reconnect(portIndex: number, name: string, input: NodeMidiInput): void {
    this.portIndex = portIndex;
    this.nameValue = name;
    this.input = input;
    this._state = "connected";

    if (this.callbacks.size > 0) {
      if (!this.handler) {
        this.handler = (_deltaTime: number, message: number[]) => {
          const event = {
            data: new Uint8Array(message),
            timeStamp: performance.now(),
          };

          this.callbacks.forEach((cb) => {
            cb(event);
          });
        };
      }

      try {
        if (!this.input.isPortOpen()) {
          this.input.openPort(this.portIndex);
        }
        this.input.on("message", this.handler);
      } catch (err) {
        console.error(`Error opening MIDI port ${this.portIndex}:`, err);
      }
    }
  }

  disconnect(): void {
    try {
      if (this.handler) {
        this.input.off("message", this.handler);
      }
      if (this.input.isPortOpen()) {
        this.input.closePort();
      }
    } catch (err) {
      console.error(`Error closing MIDI port ${this.portIndex}:`, err);
    }
    this._state = "disconnected";
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
  private portIndex: number;
  private nameValue: string;
  private output: NodeMidiOutput;
  private _state: "connected" | "disconnected" = "disconnected";
  private isOpen = false;

  constructor(portIndex: number, name: string, output: NodeMidiOutput) {
    this.portIndex = portIndex;
    this.nameValue = name;
    this.output = output;
  }

  get id(): string {
    return `${this.nameValue}:${this.portIndex}`;
  }

  get name(): string {
    return this.nameValue;
  }

  get state(): "connected" | "disconnected" {
    return this._state;
  }

  get type() {
    return "output" as const;
  }

  setConnected(): void {
    this._state = "connected";
  }

  reconnect(portIndex: number, name: string, output: NodeMidiOutput): void {
    this.portIndex = portIndex;
    this.nameValue = name;
    this.output = output;
    this._state = "connected";
    this.isOpen = false;
  }

  disconnect(): void {
    try {
      if (this.isOpen) {
        this.output.closePort();
      }
    } catch (err) {
      console.error(`Error closing MIDI output port ${this.portIndex}:`, err);
    }
    this.isOpen = false;
    this._state = "disconnected";
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
  private listeners = new Set<(port: IMidiPort) => void>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(MidiModule: NodeMidiModule) {
    this.MidiModule = MidiModule;
    this.scanPorts(false);
  }

  private emitStateChange(port: IMidiPort): void {
    this.listeners.forEach((listener) => {
      listener(port);
    });
  }

  private startPolling(): void {
    if (this.pollTimer) {
      return;
    }
    this.pollTimer = setInterval(() => {
      this.scanPorts(true);
    }, HOT_PLUG_POLL_INTERVAL_MS);
    this.pollTimer.unref();
  }

  private scanPorts(emitEvents: boolean): void {
    const nextInputIds = new Set<string>();
    const nextOutputIds = new Set<string>();

    // Scan input ports
    try {
      const input = new this.MidiModule.Input();
      const inputCount = input.getPortCount();

      for (let i = 0; i < inputCount; i++) {
        const portName = input.getPortName(i);
        const id = `${portName}:${i}`;
        nextInputIds.add(id);

        const existing = this.inputPorts.get(id);
        if (existing) {
          if (existing.state === "disconnected") {
            existing.reconnect(i, portName, new this.MidiModule.Input());
            if (emitEvents) {
              this.emitStateChange(existing);
            }
          }
          continue;
        }

        const reuse = Array.from(this.inputPorts.values()).find(
          (port) => port.name === portName && port.state === "disconnected",
        );
        if (reuse) {
          const oldId = reuse.id;
          reuse.reconnect(i, portName, new this.MidiModule.Input());
          this.inputPorts.delete(oldId);
          this.inputPorts.set(reuse.id, reuse);
          if (emitEvents) {
            this.emitStateChange(reuse);
          }
          continue;
        }

        const portInput = new this.MidiModule.Input();
        const port = new NodeMidiInputPort(i, portName, portInput);
        port.setConnected();
        this.inputPorts.set(id, port);
        if (emitEvents) {
          this.emitStateChange(port);
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
        const id = `${portName}:${i}`;
        nextOutputIds.add(id);

        const existing = this.outputPorts.get(id);
        if (existing) {
          if (existing.state === "disconnected") {
            existing.reconnect(i, portName, new this.MidiModule.Output());
            if (emitEvents) {
              this.emitStateChange(existing);
            }
          }
          continue;
        }

        const reuse = Array.from(this.outputPorts.values()).find(
          (port) => port.name === portName && port.state === "disconnected",
        );
        if (reuse) {
          const oldId = reuse.id;
          reuse.reconnect(i, portName, new this.MidiModule.Output());
          this.outputPorts.delete(oldId);
          this.outputPorts.set(reuse.id, reuse);
          if (emitEvents) {
            this.emitStateChange(reuse);
          }
          continue;
        }

        const portOutput = new this.MidiModule.Output();
        const port = new NodeMidiOutputPort(i, portName, portOutput);
        port.setConnected();
        this.outputPorts.set(id, port);
        if (emitEvents) {
          this.emitStateChange(port);
        }
      }

      if (output.isPortOpen()) {
        output.closePort();
      }
    } catch (err) {
      console.error("Error scanning MIDI output ports:", err);
    }

    for (const [id, port] of this.inputPorts) {
      if (!nextInputIds.has(id) && port.state === "connected") {
        port.disconnect();
        if (emitEvents) {
          this.emitStateChange(port);
        }
      }
    }

    for (const [id, port] of this.outputPorts) {
      if (!nextOutputIds.has(id) && port.state === "connected") {
        port.disconnect();
        if (emitEvents) {
          this.emitStateChange(port);
        }
      }
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
    callback: (port: IMidiPort) => void,
  ): void {
    this.listeners.add(callback);
    this.startPolling();
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
