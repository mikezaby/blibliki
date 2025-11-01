import { Context } from "@blibliki/utils";
import Note from "../Note";
import { EventListerCallback, IMidiInput, MidiPortState } from "./MidiDevice";
import MidiEvent from "./MidiEvent";

const MAP_KEYS: Record<string, Note> = {
  a: new Note("C3"),
  s: new Note("D3"),
  d: new Note("E3"),
  f: new Note("F3"),
  g: new Note("G3"),
  h: new Note("A3"),
  j: new Note("B3"),
  k: new Note("C4"),
  l: new Note("D4"),
  w: new Note("C#3"),
  e: new Note("D#3"),
  t: new Note("F#3"),
  y: new Note("G#3"),
  u: new Note("A#3"),
  o: new Note("C#4"),
  p: new Note("D#4"),
};

const computerKeyboardData = () => ({
  id: "computer_keyboard",
  name: "Computer Keyboard",
  state: MidiPortState.connected,
});

export default class ComputerKeyboardInput implements IMidiInput {
  id: string;
  name: string;
  state: MidiPortState;
  eventListerCallbacks: EventListerCallback[] = [];
  private context: Readonly<Context>;

  constructor(context: Context) {
    const { id, name, state } = computerKeyboardData();
    this.id = id;
    this.name = name;
    this.state = state;
    this.context = context;

    document.addEventListener("keydown", this.onKeyTrigger(true));
    document.addEventListener("keyup", this.onKeyTrigger(false));
  }

  addEventListener(callback: EventListerCallback) {
    this.eventListerCallbacks.push(callback);
  }

  removeEventListener(callback: EventListerCallback) {
    this.eventListerCallbacks = this.eventListerCallbacks.filter(
      (c) => c !== callback,
    );
  }

  serialize() {
    const { id, name, state } = this;

    return { id, name, state };
  }

  onKeyTrigger = (noteOn: boolean) => (event: KeyboardEvent) => {
    const note = this.extractNote(event);
    if (!note) return;

    const midiEvent = MidiEvent.fromNote(
      note,
      noteOn,
      this.context.browserToContextTime(event.timeStamp),
    );
    this.eventListerCallbacks.forEach((callback) => {
      callback(midiEvent);
    });
  };

  private extractNote(event: KeyboardEvent): Note | undefined {
    if (event.repeat) return;

    return MAP_KEYS[event.key];
  }
}
