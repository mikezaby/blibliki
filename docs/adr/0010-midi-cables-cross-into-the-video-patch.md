# 10. MIDI is one layer: audio MIDI outputs cable into video MIDI inputs

Date: 2026-09-10. Status: accepted. Supersedes ADR 8; extends the route
kinds of ADR 5.

## Context

ADR 8 fed notes to video instances by naming an audio module inside a
control module and allocating there. That was a second way of working
beside the audio engine's, where MIDI Input, Voice Scheduler, MIDI
Mapper and the sequencers are modules joined by MIDI connections and
each poly module reacts to its own voice's notes. Rebuilding those tools
for video would duplicate every one of them.

## Decision

MIDI is one layer. The MIDI tools stay in the audio engine, which runs on
the main thread where Web MIDI lives, and their outputs cable into video
modules:

- MIDI is the third route kind in the video engine, beside texture and
  control. A video module with a MIDI input (MIDI Notes, Envelope) gets a
  MIDI input handle, and a cable from an audio module's MIDI output into
  it is valid. The route lives in the video patch with the audio module
  as its source; the video engine accepts a MIDI route whose source it
  does not know.
- The grid bridges each such route: it listens on the audio module's
  MIDI output through `MidiOutput.listen` and posts each note on and off
  to the worker for the route's destination. Web MIDI is not available
  in a worker, so the bridge is unavoidable; it is one small message per
  note.
- The audio Voice Scheduler allocates for video too. Its events carry a
  voice number, which the bridge passes as the instance number, so an
  Oscillator with six voices and a Source with six instances fed by the
  same scheduler line up: instance i shows what voice i plays. A note
  that never passed a scheduler lands on instance 0, as an untagged audio
  event goes to voice 0. A note for an instance a module lacks is
  dropped.
- No MIDI module lives in the video engine. It has receivers only.

## Alternatives rejected

- A MIDI Input and an Instance Scheduler inside the video engine, with a
  device picker of their own. Built and dropped the same day: every MIDI
  tool would have needed a copy, and a video patch could not follow the
  synth's voices.
- Naming an audio module inside a video control module (ADR 8). It hides
  the connection and the allocation inside one module instead of showing
  a cable and a scheduler.
- A MIDI layer outside both engines. The audio engine's MIDI modules are
  that layer already; moving them would be a large refactor for no new
  capability.

## Consequences

The audio engine gained one hook, `MidiOutput.listen`. Cross-engine
cables are MIDI only; texture and control stay inside the video patch,
and audio props still reach video through Audio Prop. A stolen voice
delivers its note off and the new note on in one message, so an Envelope
on that instance retriggers. Control change is not bridged yet.
