/**
 * node-midi adapter for Node.js
 */
import { isNode } from "es-toolkit";
import type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
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

type NodeMidiModule = {
  Input: new () => NodeMidiInput;
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

  setState(state: "connected" | "disconnected"): void {
    this._state = state;
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

class NodeMidiAccess implements IMidiAccess {
  private ports = new Map<string, NodeMidiInputPort>();
  private MidiModule: NodeMidiModule;

  constructor(MidiModule: NodeMidiModule) {
    this.MidiModule = MidiModule;
    this.scanPorts();
  }

  private scanPorts(): void {
    try {
      const input = new this.MidiModule.Input();
      const portCount = input.getPortCount();

      for (let i = 0; i < portCount; i++) {
        const portName = input.getPortName(i);
        const id = `node-midi-${i}`;

        if (!this.ports.has(id)) {
          // Create a new input instance for each port
          const portInput = new this.MidiModule.Input();
          const port = new NodeMidiInputPort(i, portName, portInput);
          this.ports.set(id, port);
        }
      }

      // Clean up the scanning input
      if (input.isPortOpen()) {
        input.closePort();
      }
    } catch (err) {
      console.error("Error scanning MIDI ports:", err);
    }
  }

  *inputs(): IterableIterator<IMidiInputPort> {
    for (const [, port] of this.ports) {
      yield port;
    }
  }

  addEventListener(
    _event: "statechange",
    _callback: (port: IMidiInputPort) => void,
  ): void {
    // node-midi doesn't support hot-plugging detection
    // This could be implemented with polling if needed
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
