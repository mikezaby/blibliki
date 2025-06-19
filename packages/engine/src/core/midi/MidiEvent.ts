import { Message } from "webmidi";
import Note, { INote } from "../Note";
import { t, TTime } from "../Timing/Time";

export enum MidiEventType {
  noteOn = "noteon",
  noteOff = "noteoff",
  cc = "cc",
}

export default class MidiEvent {
  note?: Note;
  voiceNo?: number;
  readonly triggeredAt: TTime;
  private message: Message;

  static fromNote(
    noteName: string | Note | Omit<INote, "frequency">,
    noteOn: boolean = true,
    triggeredAt?: TTime,
  ): MidiEvent {
    const note = noteName instanceof Note ? noteName : new Note(noteName);

    return new MidiEvent(new Message(note.midiData(noteOn)), triggeredAt);
  }

  static fromCC(cc: number, value: number, triggeredAt?: TTime): MidiEvent {
    return new MidiEvent(
      new Message(new Uint8Array([0xb0, cc, value])),
      triggeredAt,
    );
  }

  constructor(message: Message, triggeredAt?: TTime) {
    this.message = message;
    this.triggeredAt = triggeredAt || t();
    this.defineNotes();
  }

  get type() {
    return this.message.type as MidiEventType;
  }

  get isNote() {
    return (
      this.type === MidiEventType.noteOn || this.type === MidiEventType.noteOff
    );
  }

  defineNotes() {
    if (!this.isNote) return;
    if (this.note) return;

    this.note = Note.fromEvent(this.message);
  }

  clone(voiceNo?: number) {
    const newEvent = new MidiEvent(this.message, this.triggeredAt);
    newEvent.voiceNo = voiceNo;

    return newEvent;
  }
}
