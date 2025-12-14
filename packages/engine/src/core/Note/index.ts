import { Seconds } from "@blibliki/transport";
import Message from "../midi/Message";
import frequencyTable from "./frequencyTable";

const Notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MIDI_OCTAVE_SYTSTEM = 2;

export type INote = {
  name: string;
  octave: number;
  frequency: number;
  duration?: Seconds;
  velocity?: number;
};

export default class Note implements INote {
  static _notes: Note[];
  name!: string;
  octave!: number;
  velocity = 1;
  duration?: Seconds;

  static fromFrequency(frequency: number) {
    let noteName: string | undefined;

    for (const [note, freq] of frequencyTable) {
      if (freq !== frequency) continue;

      noteName = note;
      break;
    }

    if (!noteName) throw Error("Not matching frequency with a note");

    return new Note(noteName);
  }

  static fromEvent(message: Message) {
    const dataByte = message.data[1];
    if (dataByte === undefined) {
      throw new Error("Invalid MIDI message: missing data byte");
    }
    const name = Notes[dataByte % 12];
    if (!name) {
      throw new Error(`Invalid MIDI note number: ${dataByte}`);
    }
    const octave = Math.floor(dataByte / 12) - 2;

    return new Note(`${name}${octave}`);
  }

  static notes(octave = 3) {
    return Notes.map((note: string) => new Note(`${note}${octave}`));
  }

  constructor(note: Omit<INote, "frequency"> | string) {
    if (typeof note === "string") {
      this.fromString(note);
    } else {
      this.fromProps(note);
    }
  }

  get isSemi() {
    return this.name.endsWith("#");
  }

  get fullName() {
    return `${this.name}${this.octave}`;
  }

  get frequency(): number {
    return frequencyTable.get(`${this.name}${this.octave}`)!;
  }

  midiData(noteOn = true): Uint8Array {
    const statusByte = noteOn ? 0x90 : 0x80;
    return new Uint8Array([statusByte, this.midiNumber, this.velocity * 100]);
  }

  get midiNumber(): number {
    return (this.octave + MIDI_OCTAVE_SYTSTEM) * 12 + this.noteIndex;
  }

  get noteIndex(): number {
    return Notes.indexOf(this.name);
  }

  valueOf() {
    return this.fullName;
  }

  serialize(): INote {
    return {
      name: this.name,
      octave: this.octave,
      frequency: this.frequency,
      velocity: this.velocity,
      duration: this.duration,
    };
  }

  private fromString(string: string) {
    const matches = /(\w#?)(\d)?/.exec(string);
    if (!matches) {
      throw new Error(`Invalid note string: ${string}`);
    }

    const name = matches[1];
    if (!name) {
      throw new Error(`Invalid note name in: ${string}`);
    }

    this.name = name;
    this.octave = matches[2] ? parseInt(matches[2]) : 1;
  }

  private fromProps(props: Omit<INote, "frequency">) {
    Object.assign(this, props);
  }
}
