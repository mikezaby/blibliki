import { Context } from "@blibliki/utils";
import { MessageEvent, Input } from "webmidi";
import MidiEvent, { MidiEventType } from "./MidiEvent";

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
  private input: Input;

  constructor(input: Input, context: Context) {
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
    this.input.addListener("midimessage", (e: MessageEvent) => {
      this.processEvent(e);
    });
  }

  disconnect() {
    this.input.removeListener();
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

  private processEvent(event: MessageEvent) {
    const midiEvent = new MidiEvent(
      event.message,
      this.context.browserToContextTime(event.timestamp),
    );

    switch (midiEvent.type) {
      case MidiEventType.noteOn:
      case MidiEventType.noteOff:
        this.eventListerCallbacks.forEach((callback) => {
          callback(midiEvent);
        });
    }
  }
}
