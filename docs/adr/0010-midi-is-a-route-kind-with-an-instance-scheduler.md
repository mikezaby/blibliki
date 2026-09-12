# 10. MIDI is a route kind in the video engine, handed out by an Instance Scheduler

Date: 2026-09-10. Status: accepted. Supersedes ADR 8; extends the route
kinds of ADR 5.

## Context

ADR 8 fed notes to video instances by tapping an audio module's MIDI
output on the host and allocating inside a control module. In use that
was a second way of working: the audio engine has MIDI connections, a
VoiceScheduler module that hands each note to a voice, and modules that
react to their own voice's notes. The video engine should work the same
way, and read a MIDI device itself rather than borrow the audio patch's.

## Decision

- MIDI is the third route kind, beside texture and control. A MIDI route
  joins a MIDI output port to a MIDI input port; routes into one input
  accumulate. Events travel when they arrive, not per frame: the engine
  delivers an event along MIDI routes depth first and sends on whatever
  each receiver returns.
- A MIDI Input module names a device from the same list the audio MIDI
  Input picks from. The host listens on that device and forwards note on
  and off to the worker as the module's output, re-tapping when the patch
  or the device list changes. Web MIDI is not available in a worker, so
  the host bridges; the video patch still owns the choice of device.
- An Instance Scheduler has an `instances` count and hands each note to
  an instance with the audio VoiceScheduler's policy: a held note
  retriggers its instance, else the lowest free instance, else the
  earliest started, which receives a note off first. It re-emits the
  event tagged with the instance, as audio events carry a voice number.
- Modules with a MIDI input act on the tagged instance, instance 0 when
  untagged, and drop notes for instances they lack: MIDI Notes turns them
  into gate, note and velocity controls per instance, and Envelope opens
  and closes the instance's gate.

## Alternatives rejected

- Keeping the audio-module tap (ADR 8). It ties a video patch to the audio
  patch and hides the scheduler inside a control module.
- Allocating on the host. The worker owns every other part of the patch.
- Letting a module without a scheduler spread untagged notes across its
  instances. The audio engine sends an untagged event to voice 0; the
  scheduler is the one place that allocates.

## Consequences

A note passes through the scheduler and its consumers in one message,
so a stolen instance sees its note off and the new note on in the same
frame and an Envelope on it retriggers. A MIDI cycle is cut after 16
hops. Control change is not forwarded yet.
