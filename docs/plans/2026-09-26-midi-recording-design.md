# Recording played notes into the step sequencer

Status: built on branch `feat/68-record-played-notes-step-sequencer`,
2026-09-26, for issue #68. Builds on the Step Edit redesign in
`2026-09-23-xl3-step-entry-design.md`. The settings decision is ADR 15.

## Why

Playing could not become a pattern. A bassline played on a keyboard had to
be re-entered step by step. Notes never reached the sequencer: the session
listened to the controller only, Record was the WAV recording, and with no
MIDI keyboard there was no way to hear a sound at all.

The behaviour below is what the hardware manuals describe (Digitakt II p.
42 and 82, Analog Rytm MKII p. 40, 45 and 46, Circuit Tracks p. 35, 37 and
87), with two additions the user asked for: a one-pass recording, and a
quantize grid to choose.

## Decisions

### 1. The session hears the note input

The note input module's outgoing MIDI is tapped with `MidiOutput.listen`,
route free, and every note goes down the same path a controller event
does: the surface reducer. Only notes on the active track's channel count.
The session, not the engine, decides what a note means.

### 2. In Step Edit, a note is a value

- A note played while a step is held replaces the step's notes; later notes
  join the chord, up to eight, all at the first note's velocity (the
  Digitakt rule). The step keeps its length, chance and timing.
- Keys held while a step is tapped stamp their chord onto it (Novation).
- The last note played becomes the track's default note (KeyStep Pro,
  Pyramid), so playing a note and then tapping steps writes it.

Notes are ignored in performance mode. Every session emit re-sends all 16
step LEDs, and nothing in performance mode needs the note.

### 3. Step record: Shift + Record

Record alone is the WAV recording, so step record arms on Shift + Record,
in Step Edit. A note, or a chord whose keys are released together, writes
the cursor step and advances; Track right leaves a rest and advances; Track
left goes back; a step button moves the cursor. The cursor wraps around the
bars of the loop and a bar change is written as the sequencer's active page.
The cursor lights like a held step.

For this to work the engine's XL3 controller had to learn Shift: it now
leaves the transport and the session recording alone on a shifted Play or
Record press.

### 4. Real-time record: Shift + Play

Shift + Play arms real-time record on a sequencer track, in either mode.
While the transport runs, a note on the track's channel is written where the
sequencer says it was heard: `StepSequencer.positionAt(contextTime)` maps a
moment to the nearest step with its signed distance in ticks, and the
session writes with pure functions in `sequencer/liveRecord.ts`. Velocity
is the played one; duration is the option nearest the time the key was
held; timing is snapped to the chosen grid, or kept as microtime when
quantize is off.

- Overdub adds to a step. Replace takes the step over on the first note of
  a pass; later notes on the same step in the same pass join, so a chord
  stays a chord. A silent pass erases nothing.
- One pass records from the next start of the loop until the loop wraps
  (from the start when arming starts the transport), then disarms. Loop
  records until stopped. Stopping the transport ends a recording.
- Erase while playing: hold Shift + Page Down while recording, and the
  playhead erases the steps it passes. It outranks the bar copy on that
  combo, which only matters while recording in Step Edit.
- Pre-count: arming with the transport stopped starts it after one bar of
  clicks. `Metronome.countIn` schedules the clicks and returns when they
  end; `Engine.start(actionAt)` starts the transport at that moment.

Step and real-time record never run together; arming one disarms the other.

### 5. A metronome in the engine

`Metronome` is a module with a transport source that clicks on every beat
of the time signature (1600 Hz on the downbeat, 1000 Hz on the rest, 40 ms),
and a count-in on demand. The instrument runtime adds one and routes it
straight to the Master, past the session recorder. The grid's palette
offers it too, since the palette is exhaustive over module types.

### 6. Settings on the console

A settings icon in the console chrome opens a dialog with one page, MIDI
recording: metronome, pre-count, quantize (off, 1/32, 1/16, 1/8, 1/4),
length (loop or one pass), overdub. Console-wide, stored in the browser,
never in the instrument (ADR 15). A grid finer than the track's step is the
step.

### 7. Keys on the console

A piano under the display (white keys in a row, black keys over the gaps),
or pads named after a drum machine's parts, plays the active track through
the note input on its own channel, so the session records them like any
keyboard. The computer keyboard plays the same notes with the engine's
mapping (home row, sharps above) whenever nothing is being typed; pads walk
the home row first. Each pad also names the MIDI note that plays it, so a
controller can drive the drum machine without guessing.

The keys light while their note sounds, from any source: the console
listens to the track's channel filter and its sequencer. The sequencer
schedules ahead, so a note lights when it plays, not when it is sent.

The engine's own keyboard device stays excluded from the instrument's note
input. The history records no reason for the exclusion, but there is one:
`MidiEvent.fromNote` always sent on channel 1, so the device could never
follow the active track. `fromNote` now takes a channel, and the console's
keys use it. No arrow key conflict was found: the device maps letters only.

## Gestures

| Gesture                             | Where           | Does                                 |
| ----------------------------------- | --------------- | ------------------------------------ |
| Hold [Step], play [Keys]            | Step Edit       | The step gets the note, then a chord |
| Hold [Keys], tap [Step]             | Step Edit       | The step gets the chord              |
| Play [Keys], tap [Step]             | Step Edit       | New steps get the last note played   |
| [Shift] + [Record]                  | Step Edit       | Step record on and off               |
| Play [Keys] / [Track ▶] / [Track ◀] | Step record     | Write and move on / rest / back      |
| Tap [Step]                          | Step record     | Move the cursor                      |
| [Shift] + [Play]                    | Sequencer track | Real-time record on and off          |
| Hold [Shift] + [Page ▼]             | Recording       | Erase as the playhead passes         |

The console's Record and Erase buttons play the same events, as the Step
Edit button does. The cheatsheet lists every gesture in context.

## Open questions

1. Does the hardware send a release for Page Down and Play in DAW mode? The
   erase hold ends on Page Down's release or Shift's, so a missing Page Down
   release still ends it with Shift. Check on the device.
2. The console's keys send velocity 127; a pointer has none. Mouse position
   on the key could set it later.
3. A recording armed mid-loop in one-pass mode waits for the next start of
   the loop. Digitakt records at once; the wait is what "one pass over the
   loop" asks for. Revisit if it feels late.
4. Pre-count is one bar. Hardware offers a bar count; the setting is a
   boolean until someone asks for two.

## Increments, as committed

1. Played notes reach Step Edit (hold and play, stamp, default note).
2. The XL3 leaves shifted Play and Record to the surface (engine).
3. Step record with auto-advance.
4. A metronome, and the sequencer places a moment on its steps (engine).
5. Real-time record, with settings (instrument), plus the grid's metronome.
6. The console records, and has settings.
7. Keys on the console play the active track; `fromNote` takes a channel.

## Not decided here

Knob movement capture (#58), pattern chaining (#70), the console's own step
row (#66), a velocity for the on-screen keys, and more settings pages.
