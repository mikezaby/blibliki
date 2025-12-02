import { Context } from "@blibliki/utils";
import Message from "./Message";
import MidiEvent, { MidiEventType } from "./MidiEvent";
import type { IMidiInputPort, IMidiMessageEvent } from "./adapters";

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
  private input: IMidiInputPort;
  private messageHandler: ((event: IMidiMessageEvent) => void) | null = null;

  constructor(input: IMidiInputPort, context: Context) {
    this.id = input.id;
    this.name = input.name;
    this.input = input;
    this.context = context;

    this.connect();
  }

  get state() {
    return this.input.state as MidiPortState;
  }

  connect() {
    this.messageHandler = (e: IMidiMessageEvent) => {
      this.processEvent(e);
    };
    this.input.addEventListener(this.messageHandler);
  }

  disconnect() {
    if (this.messageHandler) {
      this.input.removeEventListener(this.messageHandler);
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

  private processEvent(event: IMidiMessageEvent) {
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
