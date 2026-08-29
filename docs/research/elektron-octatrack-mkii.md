# Elektron Octatrack MKII

Source: `docs/untracked/Octatrack-MKII-User-Manual_ENG_OS1.40_201204.pdf`
(untracked local copy of the Elektron download)
Version/date on the document: OS 1.40, filename dated 2020-12-04
Read: pages 1-146 (chapters 3-19 and appendices A-C; the effects reference in
appendix B and the MIDI note maps in appendix C sampled rather than
transcribed; printed page numbers match PDF pages)

## What it is

Eight stereo audio tracks plus eight MIDI tracks, built around sample playback,
live resampling and a crossfader. Each audio track hosts a machine (Flex,
Static, Thru, Neighbor or Pickup) and two assignable effects, and every track has
its own recorder that can sample the inputs or the machine's own output. Older
than the other three Elektrons here and structurally the odd one out: it is a
performance instrument that happens to sequence, not a sequencer that happens to
perform.

Read this alongside `elektron-digitone.md`, `elektron-analog-rytm-mkii.md` and
`elektron-digitakt-ii.md` for the shared sequencer material. This file records
what the Octatrack does differently.

## Overlap

**Parameter locks, conditional trigs, fill mode, per-track length and speed,
copy/paste at four granularities.** All present and all worded identically to the
newer machines, including the same `PRE`/`NEI`/`1ST`/`A:B` conditional-trig
examples (p. 77-78). See `elektron-digitone.md`.

**Sample locks per step** (p. 67-68), the same mechanism the Digitone calls sound
locks and the Digitakt II calls preset locks.

**Slide trigs.** Identical to the Analog Rytm's parameter slide, with the same
sentence explaining it and the same requirement that a value be locked on one of
the two trigs (p. 74). One extra rule stated here and not there: "Parameters
cannot slide to or from unlocked lock trigs."

**Swing as a per-step trig type** (p. 74), also shared with the Rytm, with a
modifier to set swing across all tracks at once.

**Slice editing with a zero-crossing snap and linear/random lock generation**
(p. 82). The Digitakt II's slice editor is a direct descendant, five years later.

## Gaps

**The crossfader, and scenes that interpolate.** Sixteen scenes per part, two
assigned to slots A and B, and a physical fader between them. "For all other
crossfader positions interpolation between the locked scene parameters will
occur. If only one of the assigned scenes contains locked parameters the
crossfader will interpolate between those values and the general parameter values
of the active part" (p. 53). Compare the Analog Rytm, where a scene is an on/off
recall of fixed values (`elektron-analog-rytm-mkii.md`, p. 29): here the same
data structure becomes a continuous morph between two full-instrument states.

Three details worth taking with it:

- Precedence is stated: "When moving the crossfader, locked scene parameters have
  priority over parameter locks. This ensures smooth transitions between scene
  parameters without the sudden changes that might be caused by parameter locks"
  (p. 53).
- Scene mute: mute one of the two assigned scenes and its locks are ignored in
  favour of the part's base values, so "given the scene parameter values are
  locked accordingly and the position of the crossfader fully activates the
  scene, [you can] for example apply washes of effects by unmuting a muted scene"
  (p. 54). A way to arm a transition before performing it.
- Discoverability: holding a scene key lights the track keys that contain locks,
  and selecting one of those lights the parameter pages that contain them
  (p. 54). Finding what a scene touches without reading a list.

**Equal-power crossfade parameters that exist only inside scenes.** `XLV`, `XVOL`
and `XDIR` shadow the normal level parameters and "will make the crossfader fade
between the volume of the tracks or inputs in an equal energy fashion. This way
of locking volumes is suitable when wanting to avoid the volume dip that
otherwise would occur when the crossfader is used to fade between two tracks and
reaches the center position" (p. 54). Each locks only to MIN or MAX; the curve
between is the whole point. A separate parameter for the same underlying value,
existing solely because the interpolation law differs.

**Six trig types, not two.** Beyond sample trigs and lock trigs (p. 66-67):

- **Trigless trigs** "function similarly to lock trigs, but trig LFOs and FX
  envelopes" (p. 66). So there are two flavours of note-less trig: one that
  changes parameters silently, and one that also restarts modulation. The
  Digitone and Digitakt collapsed these into one.
- **One-shot trigs** fire once and then disarm, and the disarm is global across
  patterns: "If a one shot trig has been trigged on track 1 of pattern A01, any
  one shot trigs on the first track of patterns A02-P16 will also be disarmed"
  (p. 66). Re-arming is its own small vocabulary of key combinations at track,
  all-track and recorder scope (p. 66-67).
- **Recorder trigs** sample into the track's own recorder buffer at that step
  (p. 67), so sampling is sequenced rather than performed.
- Plus swing and slide trigs, above.

Conversion between them is a cycle rather than a mode: pressing a trig with a
modifier walks sample trig to trigless trig to lock trig and back (p. 66).

**Track recorders: every track can resample.** Eight recorders, one per track,
each with a buffer, driven either live from the record keys or from recorder
trigs on the sequencer (p. 67). Combined with Neighbor machines this makes
feedback structures where a track processes the previous track's output and
another samples the result.

**Machines as routing, not just sources.** Five kinds (p. 17):

- `Flex`: sample in RAM, fully modulatable.
- `Static`: sample streamed from card, up to 2 GB, with a stated limitation:
  "The track LFOs can not modulate the STRT parameter of a Static machine. The
  crossfader can, but if the modulation is too fast the Static machine will not
  be able to update the start point position correctly, resulting in the sample
  not being played" (p. 55). The manual names the failure and the workaround
  (parameter locks work correctly) rather than hiding it.
- `Thru`: pass an input through the track's filter and effects.
- `Neighbor`: "listen to the output of the preceding track", so tracks chain into
  effect racks (p. 17). Track order becomes signal order.
- `Pickup`: looper.

Our `Track` has a source block and an effect chain but no way for one track to
read another's output. Neighbor is the cheapest possible expression of that and
it costs one machine type rather than a routing matrix.

**Two assignable effect slots per track from a menu of fourteen** (p. 62). FX1
offers ten (multimode filter, parametric EQ, DJ kill EQ, phaser, flanger, chorus,
spatializer, comb filter, compressor, lo-fi collection); FX2 offers those plus
four time-based ones (echo freeze delay, gatebox plate reverb, spring reverb,
dark reverb). Note the asymmetry: the reverbs and the delay are only available in
the second slot, so ordering is constrained by construction rather than by a
routing UI. Our tracks have four effect slots with any block in any slot, which
is more flexible; the Octatrack's point is that a *constrained* slot model needs
no routing editor at all.

**The LFO designer: a drawable 16-step LFO.** Each audio track has one, and all
designed waveforms are available to all audio track LFOs, labelled T1-T8 (p. 61).
Each of 16 steps holds a value, and any step can be marked to interpolate toward
the next, so the same structure gives both stepped and smooth shapes. "Such
waveforms can in some instances almost be regarded as mini-sequencers as they for
example can be used to make rhythmic track parameter changes" (p. 61). The
editing gestures are worth copying too: turning one knob edits the held step and
the knobs to either side edit the neighbouring steps; holding several steps and
turning edits them all by the same amount; and there are randomize, invert and
rotate operations (p. 61). This is the single most transferable idea here for our
`LfoBlock`, which has a fixed waveform enum.

**LFO trig modes with pattern-level sync.** Beyond the five the other Elektrons
share (free, trig, hold, one, half), three more: `SYNC TRIG` restarts "on track
start, and also every time the pattern loops", `SYNC ONE` and `SYNC HALF` restart
on track start and run for one or half a period (p. 61). Modulation locked to the
pattern rather than to notes.

**Micro timing at 1/384 of a step, with `TRIG COUNT` as a per-trig ratchet.**
"TRIG COUNT sets the number of times the sample trig should be trigged. A setting
of 2-8 adds additional trig repeats of the original trig. The additional trigs
are evenly distributed between the original trig and the next step" (p. 77). Two
notes: a trig nudged backwards off step 1 "will be activated at the end of the
pattern", and doubling the tempo multiplier doubles the micro-timing resolution
(p. 77).

**Partial quantize as a repeatable operation.** "Pressing [YES] while in this
menu can be used to quantize trigs to approximately 50 percent of their original
micro timing value. Use this operation when you want to tighten up a track where
micro timing has been used, but not fully quantize it. Quickly perform the
operation 6 times in a row to have the micro timing cleared for all trigs"
(p. 74). Halving repeatedly instead of a 0-127 amount. Cruder than the newer
machines' continuous quantize, and arguably easier to reason about.

**Tracks disconnected from the sequencer.** `PLAYS FREE` takes a track off the
transport entirely: it does not start on play and must be triggered by hand
(p. 76). Four further parameters govern what that means:

- `ONESHOT TRACK`: loop or stop at full length.
- `TRIG MODE`: `ONE` (retrigger on each press, stop only via transport stop),
  `ONE2` (press again to stop), `HOLD` (plays while held).
- `TRIG QUANT`: `DIRECT`, `TR. LEN`, or a step value, quantising both the start
  *and the stop* of a free track to the grid.

A clip-launcher inside a step sequencer, with launch quantisation, built from
four per-track settings.

**`START SILENT`: what happens to a sounding track when the pattern changes.**
Three settings per track (p. 76). `NO` lets the previous pattern's track keep
sounding "until a trig occurs on the track of the currently active pattern".
`YES` makes it "enter its release phase, set in the AMP menu, once the currently
active pattern starts playing". `AUTO` defers to a project setting. Every other
manual here leaves pattern-change voice handling unstated; this one makes it a
per-track choice and names the release behaviour.

**The arranger: a program, not a list.** Up to 256 rows, 8 arrangements per
project (p. 87). Columns for pattern, repeats, offset, length override, both
scene slot assignments, MIDI transpose, tempo and mutes (p. 88-89). Four control
rows that are not patterns at all:

- `HALT` stops at that row.
- `LOOP` loops back to an earlier row, infinitely or a set number of times, and
  "Loops can be nested" (p. 88).
- `JUMP` goes to an arbitrary row.
- `REM` is a comment, "only a visual cue and will not affect the timing" (p. 88).

Arrangements chain to each other, one at a time (p. 89). And the whole thing
"both sends and receives MIDI song pointer position" (p. 87). Compare the
Digitakt II's song rows, which have repeats but no loops, jumps or nesting
(`elektron-digitakt-ii.md`, p. 50). This is the most capable arrangement model in
any of these manuals and it gets there with four special row types rather than a
timeline UI.

**Live row navigation during arrangement playback.** Move the cursor to any row
and confirm, and "the selected row will start playing once the currently playing
row has finished playing", shown with hollow arrows versus filled ones for the
row actually playing (p. 88). Queued arrangement jumps with a visual distinction
between "playing" and "queued".

**Per-track MIDI note mapping.** Beyond the global trig mode, each audio track
can independently choose how incoming MIDI notes address it: standard, chromatic,
slots, slices, quick mute or delay control (p. 71). One external keyboard drives
eight tracks in six different idioms simultaneously.

**Trim and slice data attached to the slot, not the sample.** "It is possible to
load the same sample to two separate slots and trim them completely differently"
(p. 80), with an explicit save command to bind the edits to the file instead.
Slices likewise (p. 81). Two different chops of one file without duplicating it,
and a stated cost: the edits are lost when the slot is reused.

**Flex sample edits are session-only, and the UI says so.** "Any operations
applied to a Flex sample is remembered for the current session only... In the
Flex sample slot list, a blinking star next to the sample name will indicate
edited and unsaved samples" (p. 83). Destructive edits held in RAM with a
persistent unsaved marker.

**Parts as a layer between pattern and project.** Four per bank; a part holds
machine assignments, samples, track parameters, effect assignments and all 16
scenes, and a pattern links to one (p. 17). Parts save and reload independently
(p. 53), so `[FUNC] + [CUE]` reverts every parameter you tweaked in a set without
touching the sequence. Kits on the Rytm and Digitakt II fill a similar role, but
scenes living in the part is what makes the crossfader a per-composition
instrument rather than a global one.

**Everything auto-saves; the save command exists only to create a restore
point.** "When working within a project there is no need to save as all changes
are automatically cached on card... There exists a SAVE command for projects
though. Once you are content with a project, it is wise to save it. If you
continue your work with the project, but are not satisfied with the results, you
can then bring back the project to the previously saved state by performing a
project RELOAD command" (p. 18). Save inverted from "persist my work" to "mark a
point I can come back to". The clearest statement of this idea in any of these
manuals, and the newer Elektrons' temporary-save is the same idea at a smaller
scope.

## Constraints

### Data structure

| Thing | Value | Cite |
|---|---|---|
| Sets | limited only by card size | p. 16 |
| Banks per project | 16 | p. 17 |
| Patterns per bank | 16 (256 per project) | p. 17 |
| Parts per bank | 4 | p. 17 |
| Scenes per part | 16 | p. 53 |
| Audio tracks | 8 stereo | p. 55 |
| MIDI tracks | 8 | p. 90 |
| Flex sample slots | 128 | p. 17 |
| Static sample slots | 128, up to 2 GB each, streamed | p. 17 |
| Arrangements per project | 8, up to 256 rows each | p. 87 |
| Track recorders | 8, one per track | p. 16 |
| Slices per sample | 64, variable length, may overlap | p. 81 |
| Slice grid presets | 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64 | p. 82 |
| LFO designer waveforms | 8 (T1-T8), 16 steps each, per track | p. 61 |
| Effects per track | 2 slots, 10 choices in FX1, 14 in FX2 | p. 62 |
| Card | CompactFlash, UDMA, ≥133x, FAT32, up to 64 GB | p. 15 |

### Sequencer

| Thing | Value | Cite |
|---|---|---|
| Steps per pattern | 16, 32, 48 or 64 | p. 78 |
| Tempo multipliers | 1/8X, 1/4X, 1/2X, 3/4X, 1X, 3/2X, 2X | p. 79 |
| Micro timing resolution | 1/384 of a step (doubled at 2X) | p. 77 |
| Trig count (ratchet) | 2-8 per trig, evenly distributed to the next step | p. 77 |
| Master length | up to 64, or INF | p. 79 |
| Swing | per-step trigs, 50 = none | p. 74 |
| Partial quantize | ~50% per press; 6 presses clears micro timing | p. 74 |
| Chromatic range | 2 octaves on audio tracks, wider on MIDI tracks | p. 69 |
| Notes per MIDI track trig | up to 4 | p. 90 |
| Assignable CCs per MIDI track | 10 | p. 90 |
| Trig types | sample, note, lock, trigless, one-shot, swing, slide, recorder | p. 66-67 |
| Trig modes | tracks, chromatic, slots, slices, quick mute, delay control | p. 68-70 |
| Delay control scales | 1:2 gives 1, 2, 4, 8, 16, 32, 64, 128; 1:3 gives 1, 3, 6, 12, 24, 48, 96, 128 | p. 70 |
| Free-track quantize | DIRECT, TR. LEN, or a step value | p. 76 |
| Thru machine input gain | max boosts +12 dB, min mutes | p. 117 |
| Flex/Static pitch range | ±1 octave, integers are semitones | p. 118 |

### Arranger

| Thing | Value | Cite |
|---|---|---|
| Rows | up to 256 | p. 88 |
| Row columns | pattern, repeats, offset, length, scene A, scene B, MIDI transpose, tempo, mute | p. 88-89 |
| Control rows | HALT, LOOP (nestable), JUMP, REM | p. 88 |
| Chaining | one arrangement queued at a time | p. 89 |
| Tempo precedence | arranger overrides pattern and project tempo | p. 89 |

## Not worth copying

**Pattern chains that cannot contain the same pattern twice and cannot cross
banks** (p. 64). Both the Digitone's chains and our `patternSequence` string
already do better.

**Four-second modal timeouts on bank and pattern selection** (p. 64). Panel
ergonomics.

**The one-shot trig disarm crossing pattern boundaries** (p. 66). A one-shot trig
on track 1 of pattern A01 disarming one-shot trigs on track 1 of every other
pattern is surprising enough that the manual devotes two pages to arming and
disarming vocabulary. The feature is worth having; the global scope is not.

**Static machines' start point being unmodulatable by LFOs** (p. 55). A streaming
constraint. In a browser we hold buffers in memory; there is no Flex/Static split
to make.

**Trim and slice data bound to slots by default, lost when the slot is reused**
(p. 80). The Digitakt II's content-hash sample identity
(`elektron-digitakt-ii.md`, p. 29) is the better answer to the same problem, from
the same company, later.

**Flex sample edits lost on reboot** (p. 83). Mitigated with a blinking asterisk
rather than fixed.

**Battery-backed RAM holding patterns and parts, with a six-year life and a
"BATTERY LOW" message** (p. 15). Hardware.

**FX2 being the only slot with reverbs and delay** (p. 62). A DSP budget
expressed as a menu restriction. Our per-track chains have no such split.

## Open questions

- How scene interpolation treats non-continuous parameters. The crossfader
  interpolates between locked values (p. 53), but scenes can lock enum-valued
  parameters (machine settings, filter type) with no stated behaviour at
  intermediate positions.
- What happens when both assigned scenes lock the same parameter and a parameter
  lock on the current step also targets it. Precedence is given for scene versus
  parameter lock (p. 53) but not for the interaction with a slide trig, which is
  itself an interpolation.
- The exact equal-power curve for `XLV`/`XVOL`/`XDIR`. Described only as "equal
  energy fashion" (p. 54), with no law given, so a reimplementation would have to
  guess between the common candidates.
- Whether `TRIG COUNT` repeats inherit the original trig's parameter locks and
  conditional lock, or are evaluated independently. "The additional trigs are
  evenly distributed" (p. 77) is all that is said.
- How nested arranger loops interact with `JUMP` rows that target a row inside a
  loop. Loops "can be nested" (p. 88) with no statement of the stack depth or of
  what a jump does to the loop counters.
- What a Neighbor machine does when the preceding track is muted. The manual says
  only that muting the tracks before the last Neighbor "will not have any effect.
  To mute the chain, mute the last Neighbor machine" (p. 63), without describing
  the signal path that makes this so.
- Whether recorder trigs on a track whose recorder is currently being read by a
  Flex machine produce a defined result. Sampling into a buffer while playing it
  is the obvious thing to try with Pickup machines and is not addressed.
