/**
 * Web MIDI API adapter for browsers
 */
import type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
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

class WebMidiAccess implements IMidiAccess {
  private midiAccess: MIDIAccess;
  private portCache = new Map<string, WebMidiInputPort>();

  constructor(midiAccess: MIDIAccess) {
    this.midiAccess = midiAccess;
  }

  *inputs(): IterableIterator<IMidiInputPort> {
    for (const [, input] of this.midiAccess.inputs) {
      if (!this.portCache.has(input.id)) {
        this.portCache.set(input.id, new WebMidiInputPort(input));
      }
      yield this.portCache.get(input.id)!;
    }
  }

  addEventListener(
    event: "statechange",
    callback: (port: IMidiInputPort) => void,
  ): void {
    this.midiAccess.addEventListener(event, (e) => {
      const port = e.port;
      if (port?.type !== "input") return;

      const input = port as MIDIInput;
      if (!this.portCache.has(input.id)) {
        this.portCache.set(input.id, new WebMidiInputPort(input));
      }

      callback(this.portCache.get(input.id)!);
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
