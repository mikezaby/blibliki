import BaseMidiDevice from "./BaseMidiDevice";
import type { IMidiOutputPort } from "./adapters";

export default class MidiOutputDevice extends BaseMidiDevice<IMidiOutputPort> {
  eventDataMutator?: (event: number[] | Uint8Array) => number[] | Uint8Array;

  constructor(output: IMidiOutputPort) {
    super(output);
    this.connect();
  }

  connect() {
    // Output ports don't require connection setup like inputs
    // This method exists to satisfy the BaseMidiDevice interface
  }

  disconnect() {
    // Output ports don't require disconnection cleanup like inputs
    // This method exists to satisfy the BaseMidiDevice interface
  }

  send(data: number[] | Uint8Array, timestamp?: number) {
    if (this.eventDataMutator) {
      this.directSend(this.eventDataMutator(data), timestamp);
    } else {
      this.directSend(data, timestamp);
    }
  }

  directSend(data: number[] | Uint8Array, timestamp?: number) {
    this.midiPort.send(data, timestamp);
  }
}
