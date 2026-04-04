import { Context } from "@blibliki/utils";
import BaseMidiDevice, { MidiPortState } from "./BaseMidiDevice";
import Message from "./Message";
import MidiEvent, { MidiEventType } from "./MidiEvent";
import type { IMidiInputPort, IMidiMessageEvent } from "./adapters";

export type IMidiInput = {
  id: string;
  name: string;
  state: MidiPortState;
  eventListerCallbacks: EventListerCallback[];
};

export type EventListerCallback = (event: MidiEvent) => void;

export default class MidiInputDevice extends BaseMidiDevice<IMidiInputPort> {
  eventListerCallbacks: EventListerCallback[] = [];
  eventDataMutator?: (event: number[] | Uint8Array) => number[] | Uint8Array;

  private context: Readonly<Context>;
  private messageHandler: ((event: IMidiMessageEvent) => void) | null = null;

  constructor(input: IMidiInputPort, context: Context) {
    super(input);
    this.context = context;
  }

  connect() {
    this.messageHandler = (e: IMidiMessageEvent) => {
      this.processEvent(e);
    };
    this.midiPort.addEventListener(this.messageHandler);
  }

  disconnect() {
    if (this.messageHandler) {
      this.midiPort.removeEventListener(this.messageHandler);
      this.messageHandler = null;
    }
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
    const mutatedData = this.eventDataMutator
      ? this.eventDataMutator(event.data)
      : event.data;
    const message = new Message(
      mutatedData instanceof Uint8Array
        ? mutatedData
        : new Uint8Array(mutatedData),
    );
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
