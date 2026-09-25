/**
 * Describes the MIDI notes a module's MIDI input accepts.
 *
 * - `free`: any note, like a keyboard synth.
 * - `mapped`: a fixed set of named notes, like the parts of a drum machine.
 *   `note` is a note name ("C1"), the format steps store.
 */
export type MidiNoteMapping = {
  key: string;
  note: string;
  label: string;
};

export type MidiInputSchema =
  { kind: "free" } | { kind: "mapped"; notes: readonly MidiNoteMapping[] };

export const FREE_MIDI_INPUT_SCHEMA: MidiInputSchema = { kind: "free" };
