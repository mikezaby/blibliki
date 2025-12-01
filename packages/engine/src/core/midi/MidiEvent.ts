import { ContextTime } from "@blibliki/transport";
import Message from "./Message";
import Note, { INote } from "../Note";

export enum MidiEventType {
  noteOn = "noteon",
  noteOff = "noteoff",
  cc = "controlchange",
}

export default class MidiEvent {
  note?: Note;
  voiceNo?: number;
  readonly triggeredAt: ContextTime;
  private message: Message;

  static fromNote(
    noteName: string | Note | Omit<INote, "frequency">,
    noteOn = true,
    triggeredAt: ContextTime,
  ): MidiEvent {
    const note = noteName instanceof Note ? noteName : new Note(noteName);

    return new MidiEvent(new Message(note.midiData(noteOn)), triggeredAt);
  }

  static fromCC(
    cc: number,
    value: number,
    triggeredAt: ContextTime,
  ): MidiEvent {
    return new MidiEvent(
      new Message(new Uint8Array([0xb0, cc, value])),
      triggeredAt,
    );
  }

  constructor(message: Message, triggeredAt: ContextTime) {
    this.message = message;
    this.triggeredAt = triggeredAt;
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

  get isCC() {
    return this.type === MidiEventType.cc;
  }

  get cc(): number | undefined {
    if (!this.isCC) return;

    return this.message.dataBytes[0];
  }

  get ccValue(): number | undefined {
    if (!this.isCC) return;

    return this.message.dataBytes[1];
  }

  defineNotes() {
    if (!this.isNote) return;
    if (this.note) return;

    this.note = Note.fromEvent(this.message);
  }

  get rawMessage() {
    return this.message;
  }

  clone(voiceNo?: number) {
    const newEvent = new MidiEvent(this.message, this.triggeredAt);
    newEvent.voiceNo = voiceNo;

    return newEvent;
  }
}
