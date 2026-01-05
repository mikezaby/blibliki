/**
 * Web MIDI API adapter for browsers
 */
import type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
  IMidiOutputPort,
  IMidiPort,
  MidiMessageCallback,
} from "./types";

class WebMidiInputPort implements IMidiInputPort {
  private input: MIDIInput;
  private callbacks = new Set<MidiMessageCallback>();
  private handler: ((e: MIDIMessageEvent) => void) | null = null;

  constructor(input: MIDIInput) {
    this.input = input;
  }

  get id(): string {
    return this.input.id;
  }

  get name(): string {
    return this.input.name ?? `Device ${this.input.id}`;
  }

  get type() {
    return this.input.type;
  }

  get state(): "connected" | "disconnected" {
    return this.input.state as "connected" | "disconnected";
  }

  addEventListener(callback: MidiMessageCallback): void {
    if (this.callbacks.size === 0) {
      this.handler = (e: MIDIMessageEvent) => {
        if (!e.data) return;

        const event = {
          data: e.data,
          timeStamp: e.timeStamp,
        };

        this.callbacks.forEach((cb) => {
          cb(event);
        });
      };
      this.input.addEventListener("midimessage", this.handler);
    }
    this.callbacks.add(callback);
  }

  removeEventListener(callback: MidiMessageCallback): void {
    this.callbacks.delete(callback);

    if (this.callbacks.size === 0 && this.handler) {
      this.input.removeEventListener("midimessage", this.handler);
      this.handler = null;
    }
  }
}

class WebMidiOutputPort implements IMidiOutputPort {
  private output: MIDIOutput;

  constructor(output: MIDIOutput) {
    this.output = output;
  }

  get id(): string {
    return this.output.id;
  }

  get name(): string {
    return this.output.name ?? `Device ${this.output.id}`;
  }

  get type() {
    return this.output.type;
  }

  get state(): "connected" | "disconnected" {
    return this.output.state as "connected" | "disconnected";
  }

  send(data: number[] | Uint8Array, timestamp?: number): void {
    this.output.send(data, timestamp);
  }
}

class WebMidiAccess implements IMidiAccess {
  private midiAccess: MIDIAccess;
  private inputCache = new Map<string, WebMidiInputPort>();
  private outputCache = new Map<string, WebMidiOutputPort>();

  constructor(midiAccess: MIDIAccess) {
    this.midiAccess = midiAccess;
  }

  *inputs(): IterableIterator<IMidiInputPort> {
    for (const [, input] of this.midiAccess.inputs) {
      if (!this.inputCache.has(input.id)) {
        this.inputCache.set(input.id, new WebMidiInputPort(input));
      }
      yield this.inputCache.get(input.id)!;
    }
  }

  *outputs(): IterableIterator<IMidiOutputPort> {
    for (const [, output] of this.midiAccess.outputs) {
      if (!this.outputCache.has(output.id)) {
        this.outputCache.set(output.id, new WebMidiOutputPort(output));
      }
      yield this.outputCache.get(output.id)!;
    }
  }

  addEventListener(
    event: "statechange",
    callback: (port: IMidiPort) => void,
  ): void {
    this.midiAccess.addEventListener(event, (e) => {
      const port = e.port;
      if (!port) return;

      const midiPort: IMidiPort = {
        id: port.id,
        name: port.name ?? `Device ${port.id}`,
        state: port.state as "connected" | "disconnected",
        type: port.type as "input" | "output",
      };

      if (port.type === "input") {
        const input = port as MIDIInput;
        if (!this.inputCache.has(input.id)) {
          this.inputCache.set(input.id, new WebMidiInputPort(input));
        }
      } else {
        const output = port as MIDIOutput;
        if (!this.outputCache.has(output.id)) {
          this.outputCache.set(output.id, new WebMidiOutputPort(output));
        }
      }

      callback(midiPort);
    });
  }
}

export default class WebMidiAdapter implements IMidiAdapter {
  async requestMIDIAccess(): Promise<IMidiAccess | null> {
    try {
      if (
        typeof navigator === "undefined" ||
        typeof navigator.requestMIDIAccess !== "function"
      ) {
        return null;
      }

      const midiAccess = await navigator.requestMIDIAccess();
      return new WebMidiAccess(midiAccess);
    } catch (err) {
      console.error("Error enabling Web MIDI API:", err);
      return null;
    }
  }

  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.requestMIDIAccess === "function"
    );
  }
}
