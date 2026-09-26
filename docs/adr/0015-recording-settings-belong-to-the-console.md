# 15. Recording settings belong to the console, not the instrument

Date: 2026-09-26. Status: accepted.

## Context

Real-time record (#68) has settings: metronome, whether it clicks only
while recording, pre-count, quantize, one pass or loop, overdub or replace. They needed a home. The instrument
document is saved to Firestore and shared; the console is the page the
performer has open. The hardware the design copies (Digitakt II, Analog
Rytm, Circuit Tracks) keeps all of these global to the device, in a settings
menu, never in the pattern.

## Decision

The settings are a `MidiRecordingSettings` value owned by the console
(`InstrumentPerformance`), kept in the browser under
`blibliki.midiRecording`, and handed to the session with
`setRecordingSettings`. They are the same for every instrument the
performer opens. The session starts with the defaults, so hosts that never
set them (the Pi, tests) record with quantize at the sixteenth, overdub on,
in loop mode, with no click and no pre-count.

The metronome itself is an engine module in the instrument runtime, routed
straight to the Master so the session recorder never captures the click.
The settings only switch it on and off.

## Alternatives rejected

- **In the instrument document.** A recording preference would then travel
  with the instrument to every performer who opens it, and saving a draft
  would be needed to keep a metronome on. Nothing in the pattern depends on
  how it was recorded.
- **Per track.** Quantize could be argued per track, but the hardware does
  not do it, and a performer records one track at a time with the settings
  they last chose.
- **In the engine.** The engine has no notion of a performer or a browser,
  and the session is the layer that already turns settings into module
  updates.
