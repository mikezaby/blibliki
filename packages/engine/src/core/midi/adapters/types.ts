/**
 * Platform-agnostic MIDI interfaces
 * Allows switching between Web MIDI API and node-midi without refactoring
 */

export interface IMidiMessageEvent {
  data: Uint8Array;
  timeStamp: number;
}

export type MidiMessageCallback = (event: IMidiMessageEvent) => void;

export interface IMidiInputPort extends IMidiPort {
  addEventListener(callback: MidiMessageCallback): void;
  removeEventListener(callback: MidiMessageCallback): void;
}

export interface IMidiOutputPort extends IMidiPort {
  send(data: number[] | Uint8Array, timestamp?: number): void;
}

export interface IMidiPort {
  readonly id: string;
  readonly name: string;
  readonly state: "connected" | "disconnected";
  readonly type: "input" | "output";
}

export interface IMidiAccess {
  inputs(): IterableIterator<IMidiInputPort>;
  outputs(): IterableIterator<IMidiOutputPort>;
  addEventListener(
    event: "statechange",
    callback: (port: IMidiPort) => void,
  ): void;
}

export interface IMidiAdapter {
  requestMIDIAccess(): Promise<IMidiAccess | null>;
  isSupported(): boolean;
}
