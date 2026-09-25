# 14. MIDI inputs describe the notes they accept

Date: 2026-09-25. Status: accepted.

## Context

A step sequencer driving the drum machine asked for a pitch. Programming a
closed hat meant knowing it is F#1. The drum machine knew its note map, but
kept it in a private constant, so no consumer could offer "Closed Hat"
instead of a note name.

## Decision

A MIDI input carries a `MidiInputSchema`, declared as a constant at the top
of the module and passed to `registerMidiInput`:

- `{ kind: "free" }`: any note, like a keyboard synth. It is the default, so
  a module that passes no schema is free.
- `{ kind: "mapped", notes: [{ key, note, label }] }`: a fixed set of named
  notes. `note` is a note name ("C1"), the format steps store.

The schema is serialized with the input (`IIOSerialize.schema`). A module
that has a map builds its own note lookup from the schema, so the two cannot
drift apart. A mapped schema describes the notes, it does not filter them.

Consumers read the schema of the input they already know they drive. The
grid follows the sequencer's route to its destination input. An instrument
reads its track's source block, since the track's Voice Scheduler sits
between the sequencer and the source. Step entry works on the compiled patch
without an engine, so the source block's `"midi in"` points at the module's
exported schema and the compiler copies it onto the track as `noteSchema`.

## Alternatives rejected

- **A lookup table keyed by module type.** Every consumer would need its own
  lookup, and routes point at inputs, not module types.
- **A resolver that follows routes through pass-through modules** (the Voice
  Scheduler). Each consumer already knows its target; the resolver would
  have one caller per case and rules for every MIDI module in between.
- **A hybrid mode** (a playable range plus named notes). No module needs it
  yet.
