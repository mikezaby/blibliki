import { Context } from "@blibliki/utils";
import MidiEvent, { MidiEventType } from "./MidiEvent";
import Message from "./Message";

export enum MidiPortState {
  connected = "connected",
  disconnected = "disconnected",
}

export type IMidiDevice = {
  id: string;
  name: string;
  state: MidiPortState;
};

export type IMidiInput = IMidiDevice & {
  eventListerCallbacks: EventListerCallback[];
};

export type EventListerCallback = (event: MidiEvent) => void;

export default class MidiDevice implements IMidiDevice {
  id: string;
  name: string;
  eventListerCallbacks: EventListerCallback[] = [];

  private context: Readonly<Context>;
  private input: MIDIInput;
  private messageHandler: ((event: MIDIMessageEvent) => void) | null = null;

  constructor(input: MIDIInput, context: Context) {
    this.id = input.id;
    this.name = input.name || `Device ${input.id}`;
    this.input = input;
    this.context = context;

    this.connect();
  }

  get state() {
    return this.input.state as MidiPortState;
  }

  connect() {
    this.messageHandler = (e: MIDIMessageEvent) => {
      this.processEvent(e);
    };
    this.input.addEventListener("midimessage", this.messageHandler);
  }

  disconnect() {
    if (this.messageHandler) {
      this.input.removeEventListener("midimessage", this.messageHandler);
      this.messageHandler = null;
    }
  }

  serialize() {
    const { id, name, state } = this;

    return { id, name, state };
  }

  addEventListener(callback: EventListerCallback) {
    this.eventListerCallbacks.push(callback);
  }

  removeEventListener(callback: EventListerCallback) {
    this.eventListerCallbacks = this.eventListerCallbacks.filter(
      (c) => c !== callback,
    );
  }

  private processEvent(event: MIDIMessageEvent) {
    if (!event.data) return;

    const message = new Message(event.data);
    const midiEvent = new MidiEvent(
      message,
      this.context.browserToContextTime(event.timeStamp),
    );

    switch (midiEvent.type) {
      case MidiEventType.noteOn:
      case MidiEventType.noteOff:
      case MidiEventType.cc:
        this.eventListerCallbacks.forEach((callback) => {
          callback(midiEvent);
        });
    }
  }
}
