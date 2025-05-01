import { Input, MessageEvent } from "webmidi";
import { browserToContextTime } from "../Timing";
import MidiEvent, { MidiEventType } from "./MidiEvent";

export enum TMidiPortState {
  connected = "connected",
  disconnected = "disconnected",
}

export interface MidiDeviceInterface {
  id: string;
  name: string;
  state: TMidiPortState;
}

export type EventListerCallback = (event: MidiEvent) => void;

export default class MidiDevice implements MidiDeviceInterface {
  id: string;
  name: string;
  eventListerCallbacks: EventListerCallback[] = [];

  private input: Input;

  constructor(input: Input) {
    this.id = input.id;
    this.name = input.name || `Device ${input.id}`;
    this.input = input;

    this.connect();
  }

  get state() {
    return this.input.state as TMidiPortState;
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
      browserToContextTime(event.timestamp),
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
