import { IMidiPort } from "./adapters";

export enum MidiPortState {
  connected = "connected",
  disconnected = "disconnected",
}

export type IMidiDevice = {
  id: string;
  name: string;
  state: MidiPortState;
};

export default abstract class BaseMidiDevice<
  T extends IMidiPort,
> implements IMidiDevice {
  protected midiPort: T;

  constructor(props: T) {
    this.midiPort = props;
    this.connect();
  }

  abstract connect(): void;

  abstract disconnect(): void;

  get id() {
    return this.midiPort.id;
  }

  get name() {
    return this.midiPort.name;
  }

  get type() {
    return this.midiPort.type;
  }

  get state() {
    return this.midiPort.state as MidiPortState;
  }

  serialize() {
    return { id: this.id, name: this.name, type: this.type, state: this.state };
  }
}
