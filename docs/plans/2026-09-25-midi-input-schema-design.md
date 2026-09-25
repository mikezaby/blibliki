# MIDI Input Schema

Status: agreed 2026-09-25, not implemented yet.

## Why

A step sequencer track aimed at the drum machine asks the user for a pitch.
To program a closed hat, they have to know it is F#1 (MIDI 42) and turn the
pitch encoder down from C3 to find it. The drum machine knows which note is
which part, but that knowledge lives in a private `NOTE_TO_VOICE` constant in
`packages/engine/src/modules/DrumMachine.ts`, so nothing outside the module
can read it.

Modules should describe the MIDI notes they accept, the same way a prop
schema describes their props. A consumer, such as the step sequencer, can
then offer "Kick, Snare, Closed Hat" in place of note names.

## Decisions

### Two modes

```ts
// packages/engine/src/core/midiSchema.ts
export type MidiNoteMapping = { key: string; note: string; label: string };

export type MidiInputSchema =
  { kind: "free" } | { kind: "mapped"; notes: MidiNoteMapping[] };
```

- **free**: a keyboard synth. It takes any note, pitch bend and the rest.
- **mapped**: a fixed set of named notes, such as the parts of a drum
  machine.

A hybrid mode (a playable range plus some named notes) waits until a module
needs it.

### Declared at the top of the module, passed to `registerMidiInput`

The schema is a constant next to the module's prop schema, where a reader
finds it without reading the constructor:

```ts
export const drumMachineMidiSchema = {
  kind: "mapped",
  notes: [
    { key: "kick", note: "C1", label: "Kick" },
    { key: "snare", note: "D1", label: "Snare" },
    { key: "clap", note: "D#1", label: "Clap" },
    { key: "closedHat", note: "F#1", label: "Closed Hat" },
    { key: "tom", note: "A1", label: "Tom" },
    { key: "openHat", note: "A#1", label: "Open Hat" },
    { key: "cymbal", note: "C#2", label: "Cymbal" },
    { key: "cowbell", note: "G#2", label: "Cowbell" },
  ],
} satisfies MidiInputSchema;

this.registerMidiInput({
  name: "midi in",
  schema: drumMachineMidiSchema,
  onMidiEvent: this.onMidiEvent,
});
```

- `schema` is optional on `MidiInputProps`. Leaving it out means
  `{ kind: "free" }`. 27 modules register a `"midi in"`, most through
  `registerDefaultIOs`, and none of them change.
- The schema lives on the input, not the module, because routes connect to
  inputs. A serialized MIDI input (`IIOSerialize`) carries its `schema`.
- `note` is a note name (`"C1"`), the format steps already store, so a
  consumer writes `mapping.note` straight into a step.
- `key` is a stable id. DrumMachine builds its note to voice lookup from the
  schema and drops `NOTE_TO_VOICE`, so the map and its labels cannot drift.
  A UI can match on `key` if a label is renamed.
- A mapped schema describes the notes, it does not filter them. DrumMachine
  already ignores unmapped notes.

### Consumers ask the target they know

There is no generic resolver that follows routes through pass-through
modules. Each consumer already knows what it is driving:

- **Instruments**: the step sequencer reaches the source through the track's
  VoiceScheduler, but the track knows its source block. Step entry reads the
  schema of the source module's `"midi in"`.
- **Grid**: the sequencer's `"midi"` output route names the destination
  input. The editor reads that input's schema.

### Step entry in mapped mode

- The pitch encoder steps through the mapped notes (Kick, Snare, Clap, ...)
  instead of semitones.
- The XL3 display and the screen show `label` in place of the note name.
- A new step takes the first mapping's note, not `DEFAULT_STEP_NOTE`.
- A stored note outside the map shows its note name.
- Free mode behaves exactly as today.

Stored patterns do not change: steps still hold note names.

## Increments

Each is committed with its tests before the next starts.

1. **Engine**: `MidiInputSchema`, the `schema` prop on `registerMidiInput`,
   serialization, and DrumMachine built on its schema. The ADR recording
   where MIDI capabilities are described lands with this commit.
2. **Instruments step entry**: mapped pitch cycling, labels on the XL3
   display and the screen, the default note for a new step.
3. **Grid NoteEditor**: in mapped mode, a select of labels from
   `@blibliki/ui` in place of the free-text input.

## Not doing

- A hybrid mode, until a module needs it.
- Filtering unmapped notes at the input.
- Schemas on MIDI outputs.
