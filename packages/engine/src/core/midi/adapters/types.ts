/**
 * Platform-agnostic MIDI interfaces
 * Allows switching between Web MIDI API and node-midi without refactoring
 */

export interface IMidiMessageEvent {
  data: Uint8Array;
  timeStamp: number;
}

export type MidiMessageCallback = (event: IMidiMessageEvent) => void;

export interface IMidiInputPort {
  readonly id: string;
  readonly name: string;
  readonly state: "connected" | "disconnected";
  addEventListener(callback: MidiMessageCallback): void;
  removeEventListener(callback: MidiMessageCallback): void;
}

export interface IMidiAccess {
  inputs(): IterableIterator<IMidiInputPort>;
  addEventListener(
    event: "statechange",
    callback: (port: IMidiInputPort) => void,
  ): void;
}

export interface IMidiAdapter {
  requestMIDIAccess(): Promise<IMidiAccess | null>;
  isSupported(): boolean;
}
