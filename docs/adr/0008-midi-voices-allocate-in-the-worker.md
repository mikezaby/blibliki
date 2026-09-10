# 8. MIDI reaches video voices through a host tap and a worker-side allocator

Date: 2026-09-10. Status: accepted. Extends ADR 7.

## Context

ADR 7 gave control modules voices but no source of per-voice values. The
audio engine's PolyModule gets them from MIDI: its VoiceScheduler hands
each note to a voice. The video engine runs in a worker with no MIDI
access, and the grid already taps audio modules for video (ADR 2, Band's
analysers).

## Decision

A MIDI Voices control module names an audio module, as Band does, and the
host listens on that module's first MIDI output. `MidiOutput` gained
`listen`, an observer that needs no route, so any MIDI source in the
patch works: a device input, the computer keyboard, a sequencer, a filter.
The host forwards note on and off as a `midi` message with the note
number and a 0..1 velocity.

Allocation happens in the worker, in MIDI Voices, with the audio
VoiceScheduler's policy: a note already held retriggers its voice, else
the lowest free voice, else the voice that started earliest. Each voice
outputs gate, note and velocity as control voices, so a control route
feeds voice v of an Envelope from voice v of MIDI Voices, and the chain
after it differs per voice.

## Alternatives rejected

- Naming a MIDI device instead of an audio module. It needs a new field
  kind and picker, and misses sequencer and keyboard notes that only
  exist as module output.
- Mirroring an audio PolyModule's own allocation. It ties the video voice
  count to a synth and needs per-voice hooks the engine does not expose;
  the same policy in the worker gives the same result from the same
  notes.
- Allocating on the host. The worker owns every other control value, and
  the note stream is far smaller than the per-frame values already sent.

## Consequences

A stolen voice keeps its gate up, so its Envelope does not retrigger; a
per-frame trigger output would fix that. Note offs for notes no voice
holds are dropped. The note output is 0..127; the grid's default control
range for it is the MIDI note range.
