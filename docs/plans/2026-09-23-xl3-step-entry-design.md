# Step Entry on the Launch Control XL3

Status: agreed 2026-09-23, implemented on branch
`feat/step-edit-improvements` and merged to main on 2026-09-24, pending the
device checks under "Open questions". Supersedes the "Seq Edit Mode" and "Seq Edit Encoder Layout"
sections of `docs/plans/2026-03-11-blibliki-pi-one-step-further-design.md`.
The gesture survey behind it is `docs/research/step-entry-workflows.md` on
branch `docs/step-entry-research`. Issues #66 to #70 refer to this as the
Step Edit redesign.

## Why

A musician with the XL3 should be able to lay down a 1, 2 or 4 bar
melody, chord progression or beat in a handful of gestures, and then keep
going. Today's Step Edit is select-then-edit: one of the 16 buttons selects a
step, and the encoders edit that one step. That costs:

- A bassline of eight notes is eight presses and eight long turns, each
  starting from C3.
- A kick on the drum machine is a press and 24 ticks down. Four kicks are
  four of those.
- There is no way to put a note on many steps at once, no copy of a step or
  a bar, and the loop is capped at 4 bars while the engine allows 16.
- The OLED shows nothing in Step Edit, and nothing anywhere says what Shift
  does. The instrument is still changing, so even its author forgets.

The design below is a set of gestures other sequencers have already proven,
chosen for a controller with encoders and buttons but no pads or keys.

## Decisions

### 1. A tap toggles a step, a hold edits it

The Elektron and Circuit model. There is no selected step any more.

- A tap (press and release with no encoder moved, shorter than 300 ms)
  toggles the step. A step turned on with no notes gets the track's
  defaults: note, velocity, duration, probability.
- A press becomes a hold as soon as an encoder moves or 300 ms pass. The
  release of a hold does not toggle. Several buttons held together are
  edited together: each encoder delta applies to every held step, relative
  to that step's own value.
- Tap or hold is decided at release from the press time, so the surface
  needs no timer. The 300 ms is one constant, to tune on the device.
- The held steps' LEDs are at full brightness while held.

The surface currently reads a release only from Shift and drops value 0 from
every other button. Whether the 16 buttons send a release in DAW mode is
unconfirmed. Everything in this section depends on it, so it is checked
first (increment 0). If the device sends none, the fallback is the latched
model plus Shift + button to extend the selection, and this document is
revised.

Rejected: keeping the latched select and adding multi-select (two presses
per note, and it keeps the release blindness). Both models side by side, as
KeyStep Pro does (more to learn and to document, for one extra case).

### 2. Encoders act on the held steps, or on the track's defaults

The three rows keep their meaning. What changes is what they act on.

- Row 1 stays Active, Probability, Duration, Microtime, Resolution,
  Playback Mode, unused, Loop Length. The step parameters apply to the held
  steps. Resolution, Playback Mode and Loop Length are pattern-wide and
  ignore what is held.
- Rows 2 and 3 stay velocity and pitch of note slots 1 to 8, applied to
  slot n of every held step. Chords are edited exactly as today, under a
  hold instead of a selection.
- With nothing held, Probability, Duration, Microtime and slot 1's velocity
  and pitch edit the track's defaults. Slots 2 to 8 and Active do nothing.
- The defaults are runtime state per track. They are seeded from the first
  note of the first active step in the pattern (so a drum recipe that opens
  with a kick defaults to the kick) and otherwise from C3 at velocity 100.
  Every value set through an encoder becomes the new default, and so does
  the last note played on the track's MIDI input (the KeyStep Pro and
  Pyramid rule, added with #68).
- Pitch stays one semitone per tick. Shift + a pitch encoder moves an
  octave per tick. Stepping through a scale instead is deferred until the
  scale has a home (see open questions).
- The drum machine's voices are fixed notes (36 kick, 38 snare, 39 clap,
  42 closed hat, 45 tom, 46 open hat, 49 cymbal, 56 cowbell). Changing the
  default note with nothing held is how a voice is picked, and the OLED
  should name it.

Rejected: an encoder per step for pitch (BeatStep Pro, Zaquencer). It is the
fastest bassline entry, but chords would need a held-step view anyway and
Page Up/Down would have to become a parameter layer switch instead of a bar
switch. Both layouts switched by whether a step is held: two meanings per
encoder to remember.

### 3. Fill a bar with a euclidean pattern: Shift + row 1

With Shift held in Step Edit, row 1 encoder 1 is Pulses (0 to 16) and
encoder 2 is Rotate (0 to 15), over the current bar's 16 steps. Pulses 16 is
every step, 4 is four on the floor, 8 is eighths, rotate moves the hits to
the off-beats, and odd counts are real rhythms (Bjorklund).

- While Shift is held, the LEDs preview the result. On Shift's release the
  bar is written, and only if a fill encoder moved during the hold, so
  pressing Shift for a copy or to read the cheatsheet writes nothing.
- The fill places one note, the track's default. A pulsed step gets the
  default note added if it is missing and is turned on. A step outside the
  pulses has the default note removed, and is turned off only if no notes
  remain. Other notes are never touched, so a beat is layered: fill 4 for
  the kick, change the default to the snare, fill 2 rotated 4.
- Pulses starts at the number of steps in the bar that already hold the
  default note, rotate at 0, each time Shift is pressed. Pulses 0 clears
  that note from the bar.

Rejected: fill between two held steps (covers every step but not every
fourth). Batch edit only (every step is 16 taps).

### 4. Bars grow by copying, Shift copies

The loop is measured in pages of 16 steps. Pages are the bars.

- Loop Length runs 1 to 16, the engine's maximum, instead of 1 to 4.
  Growing past the pattern's pages appends pages. A bar that becomes
  active and holds no steps is filled with a copy of the bar before it. A
  bar that still holds steps comes back as it was, so shrinking to audition
  one bar and growing again loses nothing. Shrinking never deletes.
- Shift + Page Down copies the current bar onto the following bar,
  overwriting it, grows the loop by one if that bar was outside it, and
  moves there. Pressed repeatedly it fills the loop with one bar. Page Down
  alone goes to the previous bar; the combo runs the other way because
  Shift + Page Up is the Step Edit toggle.
- Shift + a step button: the first step tapped while Shift is held becomes
  the copy source and lights fully. Every later tap while Shift is held
  pastes the source's notes and parameters onto that step. Shift's release
  clears the source. This is Novation's Duplicate gesture with Shift as the
  modifier.
- No undo. A paste or a fill is undone by doing it again the other way, and
  Shift + Track Prev (discard draft) is the coarse restore point, as
  Elektron's temporary save and reload is. A one-level undo is a follow-up.

Rejected: growing into empty bars (the loop starts silent, one more gesture
in the common case where bars repeat). Growth copy only, no explicit copy
(getting bar 1 back onto bar 3 after bars 2 to 4 changed has no gesture).

### 5. A cheatsheet: hold Shift to read it, "?" to pin it

Every combo that is not obvious starts with Shift, so holding Shift and
reading is the natural question.

- One pure function turns the surface's state (mode, whether the track has
  a step sequencer, which steps are held, Shift) into a list of hints, each
  a gesture and an action. Adding a gesture is adding one line to that list.
  The display state gains `hints`, `shiftPressed` and `heldSteps`; the
  console needs the last two for issues #66 and #67 anyway.
- The console shows the list in a panel while Shift is held. A "?" button
  pins the panel open.
- Performance mode lists: save draft (Shift + Track Next), discard draft
  (Shift + Track Prev), enter Step Edit (Shift + Page Up, on a sequencer
  track), and the track and page buttons. Step Edit lists: tap, hold and
  turn, hold several, Shift + step to copy, Shift + Page Down to duplicate
  the bar, Shift + row 1 to fill, Shift + pitch for octaves, Loop Length
  grows and copies, Shift + Page Up to leave. While steps are held the list
  narrows to what holding enables.
- The OLED shows the first eight hints on Shift's press in the device's
  title plus 2x4 names layout, and goes back to its previous content on
  release. The display helper has two and three line layouts today; the 2x4
  layout is in the programmer's reference and needs adding and verifying on
  the device.

Rejected: a sticky panel toggled from a combo, which needs a free combo
while Shift + Play sits on the transport. An always-visible strip (permanent
screen cost, nothing on the OLED).

### 6. Feedback in Step Edit

Not asked for, but the model needs it.

- LEDs keep their four levels: off 0, programmed 64, playhead 96, and 127
  for a held step, a fill preview or a copy source.
- The per-encoder value overlay that the OLED shows in performance mode
  fires in Step Edit too, so holding a step and turning pitch shows the
  note name.

## Other controllers

The XL3 is the only controller today and a second one is expected. The step
logic (held steps, defaults, toggle, batch edit, bars, copy, fill) lives in
`packages/instrument/src/sequencer/stepEntry.ts` and knows nothing about
CCs. The list of actions a hint can name lives in
`packages/instrument/src/display/hints.ts`. The XL3 files map its buttons and
encoders onto those calls and attach its gesture names. A second controller
adds its own mapping and gesture table and reuses the rest. Nothing was
abstracted ahead of that controller.

## Implementation notes

Details settled while building, where the sections above left room:

- A second note added to a held step with a pitch encoder starts from the
  default note, not from C3, so a chord is built from its root.
- An inactive step that still holds notes shows its LED off. A tap brings
  the notes back.
- Bar navigation wraps around the bars the pattern has, not the loop, so a
  bar past the loop can still be looked at.
- The fill spreads pulse j onto step floor(j x 16 / pulses), which puts the
  first hit on the downbeat, and rotate wraps around the bar.
- The controller's text command takes 12 characters per field, so each
  cheatsheet cell is a code such as `S+Pg^ Edit`. How many of those the 2x4
  layout shows legibly needs the device.
- The public reducer takes an optional clock so tests can time taps; the
  session uses `performance.now()`.
- The cheatsheet took several rounds with the user before it read as a
  path. In Step Edit it opens with numbered steps for writing a pattern that
  name the knob rows (bottom for the note, middle for velocity, top for
  length, chance and timing), then groups the rest by context: steps, copy
  and fill, bars, mode, save and help. Gestures name their controls in
  brackets and the console draws each one as a key. The panel is opaque and
  has to fit the display without scrolling. The controller's screen lists
  the Shift combinations first, since it only shows while Shift is held.
- The console's Transport and Step Edit lamps are gone. A Step Edit button
  beside Start/Stop plays the hardware's gesture (Shift down, Page Up, Shift
  up), and the back, cheatsheet and fullscreen buttons sit in a row above
  the console frame.

## The issues

- #66, the console: the Step Edit toggle is done, as a button beside
  Start/Stop. The row of 16 cells that send the same CCs with the same tap
  and hold meaning remains, and so does the mouse question in that issue
  (how to hold a step with one pointer).
- #67, whole pattern and playhead on screen: reads `heldSteps` and the bar
  from the display state.
- #68, record played notes: step record is the natural follow-on. Record
  alone starts the WAV recording at the engine level, so the research's
  candidate is Shift + Record.
- #69 and #70 are unaffected; the cheatsheet lists save and discard.

## Open questions

1. Do the 16 buttons send a release in DAW mode? Blocking, checked in
   increment 0.
2. Where does the scale live: on the track or the instrument, stored (the
   encoder steps through degrees) or a playback filter (stored notes stay
   chromatic)? Semitones until then.
3. Do instrument patterns keep four fixed pages, or start with one and grow?
   Growth appends pages either way.
4. Audition: should a held step sound while the transport is stopped, and
   a pitch edit sound the new note? Follow-up.
5. Clearing a bar in one gesture has no free combo. Fill with pulses 0
   clears one note. Shift + Play is the candidate if the engine leaves Play
   alone.

## Increments

One branch and one review each, in this order.

0. Spike: log the 16 buttons' values on the device and confirm the release.
   Nothing is kept. No release means the fallback in decision 1 and a
   revision of this document.
1. Tap toggles, hold edits, several held, track defaults, LED meanings, OLED
   overlays in Step Edit. Tests in `packages/instrument/test/surfaces`.
2. The cheatsheet: hints function, console panel with "?", OLED 2x4 layout.
   Early, so the new gestures are readable while the rest lands.
3. Bars: Loop Length to 16 with copy on growth, Shift + Page Down.
4. Shift + step copy.
5. Euclidean fill. Last because it is the only new algorithm.
6. Then #66's console row and #67.

## Not decided here

The console's own step row (#66), step and live record (#68), drum lanes
picked by column (TR-REC), generators beyond the euclidean fill, and
pattern chaining (#70).
