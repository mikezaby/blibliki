# Elektron Digitone

Source: `docs/untracked/Digitone-User-Manual_ENG_OS1.31_210602.pdf` (untracked
local copy of the Elektron download)
Version/date on the document: "This manual for Digitone OS version 1.31 was last
updated May 11, 2021" (p. 11); copyright 2021
Read: pages 1-98 (table of contents, pp. 4-9, skimmed for structure only;
printed page numbers match PDF pages)

## What it is

A four-track polyphonic FM synth with an eight-voice pool and Elektron's step
sequencer. Four operators per voice in eight fixed algorithms, but the signal
path afterwards is deliberately subtractive: FM engine into overdrive, then a
base-width filter, then a multimode filter, then amp (p. 84). Four additional
MIDI tracks sequence external gear. Relevant to us for the sequencer far more
than the synthesis: this is the reference implementation of parameter locks,
conditional trigs and per-track scale, all of which our `StepSequencer` lacks.

## Overlap

**Tracks holding a preset plus a sequence.** Their Sound is "a collection of
the synth track settings in the SYN1, SYN2, FLTR, AMP, and LFO PARAMETER pages"
plus the SOUND SETUP and ARPEGGIATOR menus (p. 16). Ours is a `Track` with
source/amp/filter/lfo1/fx blocks. Same idea. Their key rule: "A Sound imported
to a pattern, becomes an independent copy of the Sound on the +Drive and is not
linked to the original Sound on the +Drive. Instead, it becomes a part of the
pattern" (p. 16). Copy-on-import, never a live reference. Worth matching in our
patch storage: it removes a whole class of "the preset changed under my project"
problems.

**Per-step notes with velocity and length.** `IStep.notes` with velocity, plus
`duration`, maps onto their TRIG page ROOT / VEL / LEN (p. 45). Theirs has an
`INF` length setting for infinite notes (p. 45), which is how they do drones
rather than Circuit Tracks' tie-forward flag
(`novation-circuit-tracks.md`, UG p. 51).

**Per-step probability.** Theirs is PROB, 0-100%, "re-evaluated every time a
trig is set to play" (p. 45). Ours is the same, continuous, plus a global
`probabilityAmount` scaler they do not have. Parity, slightly ahead.

**Micro timing.** Per-step time offset on both synth and MIDI tracks, stored in
the pattern (p. 37). Ours is `microtimeOffset`, -50 to +50 ticks. Same feature.
Theirs adds a *quantize-after-the-fact* control: TRK and GLOBAL quantize
parameters, 0-127, that pull off-grid trigs toward the grid in real time rather
than destructively rewriting them (p. 37). That is a better model than a
one-shot quantize command.

**Pattern chaining.** Up to 64 patterns from any bank, in any order, built by
holding trig keys in sequence (p. 44). Comparable to our `patternSequence`
string, and like ours it allows non-contiguous chains, unlike Circuit Tracks.
But: "chains cannot be saved and are lost when you switch the Digitone off"
(p. 44). Ours persists, which is better.

**Per-track LFOs with waveform, speed, depth, phase.** Two per synth track
(p. 52-53). Our `LfoBlock` has one with sync, frequency, division, waveform,
offset, amount, phase. Theirs adds a bipolar speed (negative plays the cycle
backwards, p. 53), a `MULT` multiplier against either current BPM or a fixed
120 BPM (p. 53), a bipolar `FADE` where positive fades out and negative fades in
(p. 54), and five trig modes (p. 54, below).

**Send effects.** Chorus, delay, reverb as project-level sends with per-track
send amounts (p. 60), plus a master overdrive at the very end of the chain
(p. 63). We use per-track insert chains instead. Their delay is fully specified
in a way ours is not: time in 128th notes with a divide-ratio table, ping-pong
on/off, bipolar stereo width, feedback to 198, and separate feedback HPF and LPF
(p. 61).

**MIDI tracks that sequence external gear.** Eight assignable CCs per track with
the CC *number* on one page and the CC *value* on another, so the value can be
parameter-locked while the assignment stays fixed (p. 58). Our `IStep.ccMessages`
stores number and value together per step, which is simpler but means changing
which CC a lane controls rewrites every step.

## Gaps

**Parameter locks.** The central idea of the whole machine: any parameter on any
page can hold a different value on any single step. "Parameter locks make it
possible to set every trig to have its unique parameter values" (p. 40). Two
trig types support this: note trigs, and *lock trigs* which "trigger parameter
locks (but does not trigger notes)" (p. 32), so a step can change the filter
cutoff without sounding a note. Locks are entered by holding a step and turning
a knob, in any of the three record modes, and removed by holding the step and
pressing the knob (p. 41). Budget: "Up to 80 different parameters can be locked
in a pattern. A parameter counts as one (1) locked parameter no matter how many
trigs that lock it" (p. 41). Our `IStep` can carry notes and CC messages only,
so we cannot lock a module prop per step at all. This is the single largest gap
in the document and it is what makes their sequencer an instrument rather than a
piano roll.

**Sound locks.** Beyond parameter locks: any step can swap the track's entire
Sound for another from the project's 128-slot Sound pool, by holding the trig
and turning the level knob (p. 41). Circuit Tracks does the same thing for drum
samples and calls it Sample Flip
(`novation-circuit-tracks.md`, UG p. 62); Elektron generalises it to a whole
preset. Note the deliberate limit: sound locks work from the 128-Sound pool, not
the 2048-Sound +Drive library (p. 26), presumably so the lock is an 8-bit index.

**Trig conditions.** A per-step conditional rule that gates whether the trig
fires, replacing the probability parameter when set (p. 41). The set is worth
copying nearly verbatim:

- `FILL` / `not FILL`: true while fill mode is active, or its inverse (p. 42).
- `PRE` / `not PRE`: true if the most recently evaluated condition *on the same
  track* was true. The manual gives worked examples: "Trig 1, 50% = True > Trig
  2, PRE = False > Trig 3, PRE = False > Trig 4, PRE = True" (p. 42). Note the
  chaining subtlety: PRE conditions are themselves excluded from being "the most
  recently evaluated condition".
- `NEI` / `not NEI`: same, but reading the *neighbour* track, defined as the
  track before the active one; false if that track has no conditional trigs
  (p. 42).
- `1ST` / `not 1ST`: true only on the first pass of the loop (p. 42).
- `X%`: probability (p. 42).
- `A:B`: "A sets how many times the pattern plays before the trig condition is
  true. B sets how many times the pattern plays before the count is reset"
  (p. 42), with examples 1:2, 2:2, 2:4, 4:7.

Cost for us: one enum plus two small numbers on `IStep`, and a per-track
"last evaluated condition" flag threaded through the scheduler. Small, and it
buys a lot of musical variation for a step sequencer that currently only has
probability.

**Fill mode as a first-class transport state.** Not a pattern, a *mode*: cue it
for exactly one pattern cycle, hold a key to have it active for as long as you
hold, or latch it (p. 42). Combined with FILL trig conditions it gives you a
variation layer inside one pattern. The manual points out this is not only for
randomness: "they may also be used, for example, to have two different melodic
or percussive sequences on the same track, one of which is activated only when
FILL mode is active" (p. 42).

**Per-track length and speed, with a master length.** Two modes. LENGTH PER
PATTERN shares one length across tracks; LENGTH PER TRACK gives each its own
(p. 39-40). SCALE is a per-track speed multiplier: 1/8X, 1/4X, 1/2X, 3/4X, 1X,
3/2X, 2X (p. 39). Two extra pattern-level parameters make polymeter usable:

- `M.LEN` (master length) sets how many steps play before *all* tracks restart,
  and can be `INF` so tracks never realign (p. 40).
- `CH.LEN` (change length) sets how long the pattern plays before a queued
  pattern begins, which is what makes `M.LEN = INF` workable at all: "If you do
  not make any CH.LEN setting, the pattern plays infinitely, and the next pattern
  is thus not cued" (p. 40).

We have one `loopLength` and one `resolution` for the whole sequencer. Adopting
per-track length needs those two extra concepts too, or infinite-length tracks
make pattern switching impossible.

**Three distinct record modes.** GRID (place steps by hand, p. 32), LIVE (play
in real time, and turning a knob writes parameter locks and *creates lock trigs*
on empty steps, p. 41), and STEP (press a key, the cursor auto-advances, p. 34).
STEP has a JUMP variant where the note length determines how far the cursor
advances: "A LEN value of 1/16 adds a sixteenth note and advances the sequencer
one step. 1/8 adds an eighth note and advances the sequencer two steps" (p. 34),
and the length is itself locked on each trig. We have no step-entry mode at all.

**Voice allocation as user-facing policy.** A whole menu (p. 36):

- `VOICE STEALING`: CYCLE (oldest first), TRACK (track 1 beats 2 beats 3 beats
  4), LO (lowest note first), HI (highest first).
- `REUSE`: whether replaying the same note reuses its voice. "ON Reuses the same
  voice. Useful for staccato effects and drums. OFF Cycles to use another voice.
  Good for piano-like sounds and pads."
- `LOCKED VOICES`: reserve 1-8 voices to a track so no other track can steal
  them, or `D` for dynamic.
- `LAYER`: trigger two or more tracks from one note.

Our `VoiceScheduler` allocates voices with no exposed policy. Peak has voice
modes too (`novation-peak.md`, p. 29) but not locked-voice reservation or
layering.

**Portamento with four independent axes** (p. 28): TYPE (TRACK / VOICE / LEGATO
ONLY), SLOPE (constant rate versus constant time), AMOUNT for partial glides
where "lower values start the glide closer to the goal pitch", and a GLIDE
versus GLISSANDO switch that quantises the glide to semitones. Plus GATING:
whether the glide continues after key release. Compare Peak's glide, which has
time and pre-glide but no slope or partial amount (`novation-peak.md`, p. 27-28).

**Modulation routing from MIDI controllers, per Sound.** Five separate menus,
each mapping *up to four* parameter-page parameters with individual depths:
pitch bend, velocity, mod wheel, breath controller, aftertouch (p. 29-30). The
depth "is an offset of the original track parameter value" (p. 29), which is
exactly the offset semantics our `MacroMapping` uses. So our macro system is
already the right shape to absorb this; what is missing is the set of *sources*.

**Scale and chord per track, applied to input only.** KB SCALE limits which keys
are playable on the pads and on external MIDI arriving on the auto channel
(p. 35), and KB CHORD adds a three-note diatonic chord per key, or a choice of
MAJ/MIN/7TH/MIN7/MAJ7/DIM/DIM7 when the scale is chromatic (p. 35). TRANSP.
TRACK "adds an offset value and the actual note values in the sequencer do not
change" (p. 35). Non-destructive transpose, like Circuit Tracks' scale change.

**Multi map: a keyboard-range router.** Up to 128 ranges per map, 8 maps per
project (p. 72). Each range covers a note span and does one of: nothing (a
deliberate "no-play zone"), play a pattern, trigger an internal Sound, or send
MIDI out (p. 73-75). The increment parameters are the clever part: `PATTERN INC`
steps the pattern number per key, `NOTE INC` steps the note, `SND SLOT NOTE INC`
steps the Sound-pool slot per key, and `SND SLOT VEL INC` steps the slot by
*velocity*. The manual's worked example builds a velocity-layered drum kit: "Set
SND SLOT NOTE INC to 4 so each following note advances +4 slots, and SND SLOT
VEL INC to +3 so that velocity advances up to +3 slots within that 4-slot range"
(p. 74). And because sound locks record from live play, "you can then record the
track in LIVE RECORDING mode, and the sound slot changes are then recorded as
sound locks to the sequencer" (p. 74).

**Two mute layers.** GLOBAL mute is saved with the project and applies across
all patterns; PATTERN mute is saved with the pattern (p. 25). Tracks muted in
both show a third colour. We have track mute with one scope.

**Temporary save and reload.** `[FUNC]+[YES]` snapshots the active pattern to a
scratch slot; `[FUNC]+[NO]` restores it (p. 43). Explicitly a live-performance
undo: "Any changes made to the active pattern, like adding bass line notes or
using CONTROL ALL, can immediately be undone." Explicitly not persistence: "any
changes are lost if you load another project" (p. 43). One snapshot, not a
stack, and the shallowness is the point.

**Control All.** Hold a key and turn a knob to change that parameter on *all*
synth tracks at once, with "[NO] before you release [MIDI]" reverting the whole
gesture (p. 19). A transient multi-select with a built-in escape.

**Page-level randomize and reset.** `[PARAMETER] + [YES]` randomizes every
parameter on the current page; `+ [NO]` reverts that page to its last saved
state; `+ [PLAY]` resets it to defaults (p. 45). Three different "undo" scopes
on one page, all reversible.

**Copy/paste at four granularities** (pattern, track, single track *page*, and
individual trigs with their locks), all through the same three key combinations
(p. 43). Multi-trig copy preserves relative spacing: "the copied trigs are placed
in the same relation to each other as they had when they were copied" (p. 43).
And every paste or clear undoes by repeating it (p. 43).

**Operator envelopes with an end level.** Not ADSR: attack, decay, and an
adjustable *end level* the envelope settles at, "with FM you often want to
retain some modulation after a short pluck" (p. 86). Plus per-envelope delay
(p. 48), a trig/gate switch turning ADE into ASDE where the note length is the
sustain phase (p. 48), a reset-on-retrig switch (p. 49), and operator phase
reset with five options: OFF, ALL, C, A+B, A+B2 (p. 49). If we ever add an FM
block, the end-level parameter is the non-obvious one.

**LFO trig modes.** FRE (free running), TRG (restart on note), HLD (runs free
but latches its output value at note-on until the next note), ONE (one cycle
then stop, "makes the LFO function similar to an envelope"), HLF (half a cycle
then stop) (p. 54). HLD in particular is a sample-and-hold-per-note that costs
nothing to implement and does not exist on Peak.

**Pattern-level versus global audio routing.** Which tracks and which effects
reach the main output, and which tracks feed the sends, are both configurable,
per pattern with a "use global setting" opt-out (p. 38-39). And: "Audio from the
TRACK OUTPUTS is always without any effects" (p. 39).

## Constraints

### Data structure

| Thing | Value | Cite |
|---|---|---|
| Projects on +Drive | 128 | p. 16 |
| Patterns per project | 128 (8 banks x 16) | p. 16 |
| Synth tracks | 4 | p. 16 |
| MIDI tracks | 4 | p. 17 |
| Voices | 8, shared across tracks | p. 15 |
| Sound pool per project | 128 | p. 16 |
| +Drive Sound library | 2048 (8 banks x 256) | p. 16, p. 67 |
| Locked parameters per pattern | 80 distinct parameters | p. 41 |
| Chain length | up to 64 patterns, any bank, not saved | p. 44 |
| Multi map ranges | 128 per map, 8 maps per project | p. 72 |
| Notes per MIDI track trig | up to 8 (chord) | p. 17, p. 33 |
| Assignable CCs per MIDI track | 8, from CC 1-119 | p. 58 |

### Sequencer

| Thing | Value | Cite |
|---|---|---|
| Steps per pattern | up to 64 (4 pages of 16) | p. 13, p. 39 |
| Track scale multipliers | 1/8X, 1/4X, 1/2X, 3/4X, 1X, 3/2X, 2X | p. 39 |
| Track length increments | 2/16 to 64/64 | p. 40 |
| Swing | 51-80%, default 50% | p. 43 |
| Quantize amount | 0-127, per track and global | p. 37 |
| Trig velocity | 1-127; 0 equals note off | p. 45 |
| Trig length | 0.125-128, or INF | p. 45 |
| Trig probability | 0-100% | p. 45 |
| Note range | C0-G10 (MIDI 0-127) | p. 24, p. 45 |
| Track transpose | -36 to +36 semitones | p. 35 |
| Scales available | Chromatic, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian | p. 35 |
| Chords (chromatic scale) | MAJ, MIN, 7TH, MIN7, MAJ7, DIM, DIM7 | p. 35 |
| Arpeggiator speed | 1/1 to 1/96 | p. 30 |
| Arpeggiator modes | OFF, TRUE, UP, DOWN, CYCL | p. 30 |
| Arpeggiator length | max 16 sequencer steps, per-step offset in semitones | p. 30 |

### Synth engine

| Thing | Value | Cite |
|---|---|---|
| Operators | 4, grouped C / A / B1+B2 | p. 85 |
| Algorithms | 8, each with two carrier outputs X and Y | p. 85 |
| FM ratios | 0.25-16.0 | p. 46 |
| Harmonics | -26.00 to +26.00, bipolar (negative acts on C, positive on A and B1) | p. 46 |
| Feedback | 0.00-120.00; around 35 gives a sawtooth, higher gives noise | p. 47, p. 84 |
| Mix (X/Y crossfade) | -64 to 63 | p. 47 |
| Multimode filter types | OFF, 12 dB LP, 12 dB HP, 24 dB LP | p. 50 |
| Base-width filter | 1-pole (6 dB), in series *before* the multimode filter | p. 50 |
| Filter env depth | -64.00 to 63.00 | p. 50 |
| Amp/filter release | 0-126, or INF | p. 50, p. 51 |
| LFOs per synth track | 2 | p. 52 |
| LFO waveforms | Triangle, Sine, Square, Sawtooth, Exponential, Ramp, Random | p. 53 |
| LFO speed | -64.00 to 63.00, bipolar (negative runs backwards) | p. 53 |
| LFO multipliers | 1 to 2K, against current BPM or a fixed 120 BPM | p. 53, p. 55 |
| LFO trig modes | FRE, TRG, HLD, ONE, HLF | p. 54 |
| Master tune | default 440.0 Hz | p. 76 |

### Effects

| Thing | Value | Cite |
|---|---|---|
| Delay time | 1.00-128.00, in 128th notes (1 = 1/128, 128 = 1 bar) | p. 61 |
| Delay feedback | 0-198 | p. 61 |
| Reverb decay | 1-127, or INF | p. 62 |
| Send levels | OFF, 0.01-127.00 | p. 52 |
| Chorus sends onward to | delay and reverb | p. 60 |
| Delay sends onward to | reverb | p. 61 |
| Master overdrive | 0.00-127.00, at the very end of the path | p. 63 |
| USB to main gain | 0 dB to +18 dB | p. 71 |

### MIDI

| Thing | Value | Cite |
|---|---|---|
| Default auto channel | 10 | p. 69 |
| Dedicated channels | per synth track, per MIDI track, plus an FX channel, auto channel, prog-change in/out channels, multi-map channel | p. 69-70 |
| Program change | 0-127 selects pattern 1-128 (A01-H16) | p. 24 |
| Parameter output format | CC or NRPN, selectable | p. 69 |
| Encoder / trig key / mute destinations | INT, INT+EXT, or EXT | p. 69 |
| Sync out formats | MIDI, DIN 24, DIN 48, per port | p. 68 |

## Not worth copying

**Chains that vanish on power off** (p. 44). Their own manual has to warn about
it twice. Ours persist in `patternSequence`; keep it that way.

**The 80-parameter lock budget** (p. 41). A memory constraint on a 2018
embedded device, and one the manual has to explain the accounting rules for.
Copy parameter locks, not the ceiling.

**Sound locks restricted to the 128-entry pool while the library holds 2048**
(p. 26). Same story: an index-width constraint dressed as a feature ("The
primary benefit of Sounds loaded to the Sound pool is the possibility for them
to be Sound locked").

**Send-only effects shared by every track in a pattern** (p. 60). Same call as
Circuit Tracks and the same reason: fixed DSP budget. Our per-track insert
chains are better for a software target. Take their delay's *parameter set*
(feedback HPF/LPF, ping-pong, bipolar width), not the bus topology.

**Four-second timeouts on modal key combinations** (p. 31). Panel ergonomics
for a device with 16 keys doing six jobs each.

**The [FUNC]-key combinatorics generally** (p. 81-82: two full pages of them).
Not a design to admire, a symptom of no screen space. The individual *operations*
behind them are worth taking; the way they are reached is not.

**Randomize-the-whole-page** (p. 45) is tempting and cheap, but on a page of
eight related FM parameters it is a slot machine. Elektron can get away with it
because every page also has a one-key revert. Do not add the first without the
second.

## Open questions

- How trig conditions are evaluated when a track's length differs from the
  pattern length. The `A:B` description says "how many times the pattern (or
  track, if the track length is shorter than the pattern length) plays" (p. 42),
  which leaves the case where the track is *longer* than the pattern unstated.
- What `NEI` does on track 1, which has no preceding track. The manual defines
  the neighbour as "the track before the active track" and says NEI is false
  when the neighbour has no conditional trigs (p. 42), but never addresses the
  wrap-around.
- Whether parameter locks are interpolated between locked steps or held until
  the next lock. Nothing in section 10.10.1 (p. 40-41) says, and it changes what
  a locked filter sweep sounds like.
- What happens to a note whose LEN is `INF` when the pattern changes or the
  sequencer stops. "The INF setting equals infinite note length" (p. 45) with no
  further statement; pressing stop twice is documented to stop send-effect
  fade-out (p. 32) but says nothing about held notes.
- The interaction between per-track SCALE multipliers and micro timing. A track
  at 2X has steps half as long, so a fixed micro-timing offset presumably means
  a different musical duration, but the manual never connects the two.
- How the quantize parameters (0-127, p. 37) map to an amount. "The higher the
  quantize value, the more the trigs are quantized" is the entire specification,
  with no statement of whether 127 is full snap or of the curve in between.
- Whether a Sound lock takes effect on the step's note-on only, or also affects
  a note still sounding from an earlier step. Not addressed (p. 41).
