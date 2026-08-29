# Novation Peak

Source: `docs/untracked/Peak 1.2 Manual - English.pdf` (untracked local copy of
the Novation download)
Version/date on the document: "applicable to Peak synthesisers with v1.2
firmware" (p. 4); "2019 © Focusrite Audio Engineering Limited" (p. 2)
Read: pages 1-44 (printed page numbers match PDF pages)

## What it is

An eight-voice polyphonic desktop synth. Three oscillators per voice, generated
digitally in an FPGA by numerically controlled oscillators clocked at 24 MHz,
then run through an analogue filter, distortion and VCA per voice (p. 4, p. 17).
No sequencer and no keyboard: it is a sound engine with a 16-slot modulation
matrix and an arpeggiator, driven over MIDI or CV. Relevant to us as a reference
for what a serious subtractive voice contains, since our `OscBlock`,
`ThreeOscBlock`, `FilterBlock`, `AmpBlock`, `LfoBlock` and effects blocks cover
the same ground with far fewer parameters.

## Overlap

**Three-oscillator voice.** Ours is `ThreeOscBlock`; theirs is three identical
oscillators with Range (16' to 2' organ stops), Coarse (±1 octave), Fine (±100
cents) (p. 18). Our `IOscillatorProps` has `wave`, `frequency`, `fine`,
`coarse`, `octave`, `lowGain`, so the pitch controls line up almost exactly.
What theirs adds per oscillator: `VSync` virtual-oscillator sync, `SawDense` and
`DenseDet` (unison-like thickening without spending voices), `FixedNote` (any
key plays one fixed pitch, for percussion), and a per-oscillator `BendRange`
(p. 18-19).

**Wavetables.** 60 wavetables, each actually a bank of five waveforms, with the
Shape Amount control sweeping across "the five columns in the selected wavetable
to produce a 'morphing' of two adjacent columns" (p. 18). Our `Wavetable` module
has `tables` and a continuous `position`, so we already interpolate; theirs is
fixed at five frames per table. Ours is the more general model.

**Filter.** LP/BP/HP at 12 or 24 dB/oct, resonance, key tracking 0-127 where
"at the maximum value (127), the filter cut-off frequency moves in semitone
steps with the notes played" (p. 25). Our `IFilterProps` has `cutoff`,
`envelopeAmount`, `keyTrack`, `type`, `Q`, the same set, minus the slope
switch, since a `BiquadFilterNode` is fixed at 12 dB. Theirs adds two distortion
points around the filter: Overdrive before it, `FltPostDrv` after it but before
the VCA (p. 25, p. 29). The distinction is the useful part: post-filter drive
"will thus remain constant when the amplifier is gradually opened and closed by
the amplitude envelope", unlike the FX-section distortion which follows the
amplifier (p. 29).

**Envelopes.** Three per voice: Amp, Mod 1, Mod 2 (p. 22). Ours is `Envelope`
with attack, attackCurve, decay, sustain, release, retrigger. Theirs is AHDSR:
Hold sits between attack and decay, max value 127 equalling 500 ms (p. 23).
Also `Velocity` per envelope, -64 to +63, where negative inverts the
velocity-to-depth relationship (p. 23), and `MonoTrig` Legato/Re-Trig, which
maps onto our `retrigger` boolean but only applies in mono voice modes (p. 23).

**LFOs.** Ours is one `LfoBlock` per track with sync, frequency, division,
waveform, offset, amount, phase. Theirs has four: LFO 1 and 2 are per-voice with
panel controls, LFO 3 and 4 are global and menu-only, "intended for the creation
of additional modulation effects rather than fundamental tone generation"
(p. 20). The per-voice versus global split is the thing we do not have and it
matters: a per-voice LFO on a chord gives each note its own phase, which is what
`Common` off produces, and the manual says off "will give more natural results"
for pitch modulation (p. 21).

**Effects.** Distortion, chorus, delay, reverb, all saved with the patch
(p. 31). We have `Distortion`, `Chorus`, `Delay`, `Reverb`, `Compressor` as
per-track blocks. Their delay maxes at about 1.4 seconds and pitch-shifts when
the time is changed while sounding, which the `SlewRate` parameter smooths
(p. 31-32). Their chorus becomes a flanger by "adding feedback and keeping the
value of ChorDepth low" (p. 31), which is worth knowing before we add a separate
flanger block.

**Tempo sync.** 40-240 BPM, with sync divisions from 32nd triplet to 64 beats,
tabulated in MIDI ticks at 24 PPQN (p. 37). Our transport is tick-based with
`Division`, so the tables transfer directly.

## Gaps

**The modulation matrix, with two sources per slot multiplied together.** 16
slots, plus 4 more dedicated to FX. Each slot takes source A and source B, one
destination, and a depth of -64 to +63. "The two modulation sources are
effectively multiplied together, and that the Depth parameter controls the
overall degree of modulation" (p. 26). Multiple slots targeting the same
destination *add* (p. 26). The multiply is what makes it expressive: putting an
LFO in A and the mod wheel in B gives you a wheel-controlled vibrato depth in
one slot rather than needing a VCA-per-modulation. Our engine routes audio and
MIDI but has no general modulation graph with depth; this is the single largest
structural gap in the document. Cost: a real modulation layer, which is a
significant piece of work and would want its own design doc.

**Modulation destinations that are themselves modulation parameters.** LFO 1 and
2 rate, and the attack, decay and release of all three envelopes, are all
destinations (p. 39), so modulation is recursive. Also cross-oscillator FM
(O1>O2, O2>O3, O3>O1), noise-to-oscillator FM, Osc 3 to filter frequency and
noise to filter frequency (p. 39). The manual notes "only positive values of
Depth are effective for the FM options; all negative values are considered as
zero" (p. 39), and that negative depth on VSync or FM only works to cancel
modulation another slot is already applying (p. 27).

**VCA level as a matrix destination.** "The VCA is the main output stage for the
synth and this is normally under the sole control of the Amplitude Envelope, but
Peak lets you assign the VCA as a destination in the Mod Matrix. If either
Source A or Source B is not set to an Envelope, the VCA can be controlled
independently of any notes being played" (p. 27). A drone without a note on.

**Voice modes beyond poly/mono.** Five: Mono, MonoLG (legato glide: glide only
applies when notes overlap), Mono2 (voices assigned in rotation so each note
completes its own envelope), Poly, Poly2 (repeated notes reuse the same voice)
(p. 29). Our `VoiceScheduler` allocates voices but the manual's distinction
between Poly and Poly2 is a real one for voice-stealing behaviour, worked through
with an example: playing Amin7 then Cmaj in Poly costs eight voices because
C, E and G are voiced twice; in Poly2 it costs five, "which will leave three
voices free for playing a melody" (p. 29).

**Unison as a voice multiplier with detune and stereo spread.** Unison 1, 2, 3,
4 or 8 voices per note, `UniDeTune` 0-127, and `UniSpread` panning odd-numbered
voices left and even right (p. 28). `UniSpread` still applies with unison off,
in which case successive notes alternate left and right by voice number (p. 28).

**Tuning tables and microtuning.** 17 tables; table 0 is equal temperament and
cannot be edited (p. 19, p. 36). Each key is retuned to any other note plus a
fraction, "to a resolution of 1/256th of a semitone (0.4 cents)" (p. 36), and
the manual points out quarter tones are just `Retune Frac` = 127 (p. 36). Scala
files and MIDI Tuning Standard messages are both supported (p. 36). Our
`Note`/`frequencyTable` is fixed equal temperament, so this is a clean gap with
a well-defined data model to copy.

**Analogue-imperfection parameters, deliberately.** `Diverge` applies "very
small pitch variations independently to each of these 24 oscillators", static
per voice (p. 19). `Drift` is a dedicated very low frequency oscillator applying
a wandering detune that "changes over time" (p. 19). `FltDiverge` "re-creates
the subtle effect of poor filter calibration found on early analogue synths",
detuning each voice's filter by a different fixed amount (p. 29). Three
different flavours of imperfection, each cheap, and the static/wandering
distinction is the part worth keeping.

**LFO shaping parameters we do not have.** `Slew` rounds the waveform's edges,
so a square LFO on pitch becomes a glide between two tones (p. 21). `Repeats`
limits the LFO to a fixed number of cycles per trigger, 1-127 (p. 21).
`FadeMode` has four settings, not one: FadeIn, FadeOut, GateIn (delay then
start at full level), GateOut (full modulation then stop abruptly) (p. 21). And
`Phase` is Free or a fixed 0-357 degrees in 3-degree steps, retriggered on each
key press (p. 20). We have `phase` but no fade, slew or repeat count.

**Envelope Repeats: looping AHD.** "the attack, hold and decay phases of the
envelope can be made to repeat any number of times up to 126 before the sustain
and release phases of the envelope are implemented", or `On` for continuous
repeat until note release (p. 23). A free LFO-with-envelope-shape, at almost no
implementation cost on top of an existing envelope.

**Pre-Glide.** Distinct from glide: each note "will actually begin on a
chromatically-related note up to an octave above (value = +12) or below (value =
-12) the note corresponding to the key pressed, and glide towards the 'target'
note" (p. 28). Because it is per-note rather than between notes, it works with
chords, where ordinary glide does not (p. 28).

**Pickup mode for controller knobs.** "When set to On, the control needs to be
moved to the physical position corresponding to the value of the parameter saved
for the currently loaded Patch, and will only alter the parameter value once
that position is reached" (p. 34). Directly relevant to the Launch Control XL3
surface: our encoders are relative, but any absolute control we add later hits
exactly this problem.

**Compare.** Hold a button to hear the patch as saved, ignoring your edits, and
release to return to the edited version; also usable during save to audition
what is in the destination slot before overwriting it (p. 11). A/B against the
stored version, not an undo stack.

**Patch level trim saved per patch.** "With a value of 0, the Patch volume is
halved; with a value of 127, it is doubled" (p. 29), so a library of patches can
be levelled against each other independently of the mixer.

**Polyphonic aftertouch handled per note.** "When polyphonic aftertouch is
received, the pressure applied during a note event is interpreted as a
modulation event for this one note only" (p. 27). Channel aftertouch and poly
aftertouch arrive at the same `AftTouch` matrix source.

**Clock source as an explicit five-way choice with flywheel.** Auto, Internal,
Ext-Auto, MIDI, USB (p. 30). When external clock is lost, the tempo "flywheels"
to the last known rate rather than stopping or snapping back, and only `Auto`
returns to the internal `ClockRate` (p. 30). The display shows `FLY` while
flywheeling (p. 30). Compare Circuit Tracks, which just stops
(`novation-circuit-tracks.md`, UG p. 86). Peak's is the better behaviour for
anything that has to keep sounding.

**Arpeggiator with a rhythm dimension.** Seven types (Up, Down, Up-Down 1,
Up-Down 2, Played, Random, Chord) crossed with 33 predefined rhythm patterns and
an octave range of 1-6 (p. 30). Gate is a percentage of step length, so it
tracks tempo automatically (p. 29). We have no arpeggiator at all.

## Constraints

### Voice and polyphony

| Thing | Value | Cite |
|---|---|---|
| Voices | 8 | p. 4, p. 17 |
| Oscillators per voice | 3 (24 oscillators total) | p. 19 |
| Unison | 1, 2, 3, 4 or 8 voices per note | p. 28 |
| Voice modes | Mono, MonoLG, Mono2, Poly, Poly2 | p. 29 |
| Wavetables | 60, each a bank of 5 waveforms | p. 18, p. 37 |
| Oscillator ranges | 16', 8', 4', 2'; 8' = A3 440 Hz | p. 18 |
| Coarse / Fine | ±1 octave / ±100 cents | p. 18 |
| Bend range | -24 to +24 semitones, default +12 | p. 18 |
| Fixed note range | C#-2 to E5 | p. 18 |
| Pitch mod by Mod Env 2 | up to 8 octaves at ±127; value 8 = 1 octave | p. 18 |
| Pitch mod by LFO 2 | up to 5 octaves, finer resolution below ±12 | p. 18 |
| VSync | 0-127; multiples of 16 land on musical harmonics | p. 19 |
| Filter mod range | up to 8 octaves | p. 24 |
| Tuning tables | 17 (table 0 = equal temperament, read-only) | p. 19, p. 36 |
| Microtuning resolution | 1/256 semitone = 0.4 cents | p. 36 |
| Master fine tune | -50 to +50 cents | p. 34 |
| Transpose | -12 to +12 semitones; does not affect arp output | p. 35 |

### Envelope and LFO timings

| Thing | Value | Cite |
|---|---|---|
| Max attack | over 18 seconds | p. 23 |
| Max decay | approx. 22 seconds | p. 23 |
| Max release | over 24 seconds; non-linear against parameter value | p. 23 |
| Max hold | 500 ms at value 127 | p. 23 |
| Envelope repeats | Off, 1-126, or On (continuous until release) | p. 23 |
| Envelope velocity | -64 to +63 | p. 23 |
| LFO rate, Low range | 0 to 200 Hz | p. 20 |
| LFO rate, High range | 0 to 1.6 kHz | p. 20 |
| LFO phase | Free, or 0-357 degrees in 3-degree steps | p. 20 |
| LFO repeats | Off, 1-127 cycles | p. 21 |
| LFO fade modes | FadeIn, FadeOut, GateIn, GateOut | p. 21 |
| LFO sync divisions | 32nd triplet (2 ticks) to 64 beats (1536 ticks) at 24 PPQN | p. 37 |
| Glide | value 90 ≈ 1 second | p. 27 |
| Pre-glide | Off, -12 to +12 semitones | p. 28 |

### Effects

| Thing | Value | Cite |
|---|---|---|
| Max delay time | approx. 1.4 s at value 127 | p. 31 |
| Delay feedback | 64 gives 5-6 audible echoes; 127 audible after a minute | p. 31 |
| Delay L/R ratios | 1/1, 4/3, 3/4, 3/2, 2/3, 2/1, 1/2, 3/1, 1/3, 4/1, 1/4 | p. 32 |
| Delay sync range | approx. 5 ms to 1 s | p. 32 |
| Chorus types | 3: two-tap, four-tap, ensemble | p. 31 |
| Chorus feedback | -64 to +63; negative is phase-reversed | p. 31 |
| Reverb types | 3, setting RevSize to 0, 64 or 127 | p. 31 |
| FX routing | Parallel, or the six series orderings of D/R/C | p. 33 |
| Distortion placement | pre-filter (Overdrive), post-filter pre-VCA (FltPostDrv), post-VCA (FX Distortion) | p. 17, p. 29 |
| FX send point | post main VCA; return to the same point | p. 17 |
| Volume range pad | -6 dB, -3 dB, 0 dB | p. 35 |

### Modulation matrix

| Thing | Value | Cite |
|---|---|---|
| Main slots | 16, two sources each | p. 26 |
| FX slots | 4, two sources each | p. 33 |
| Sources | 23 incl. Direct, mod wheel, aftertouch, 2 pedals, velocity, keyboard, LFO 1-4 in + and +/- forms, 3 envelopes, 2 Animate buttons, CV, bend up/down | p. 39 |
| Destinations | 36 | p. 39 |
| Depth | -64 to +63 | p. 26 |
| Two sources in one slot | multiplied | p. 26 |
| Two slots, one destination | added | p. 26 |
| CV input | ±5 V, aliasing-free to just over 1 kHz | p. 8, p. 27 |

### Storage and system

| Thing | Value | Cite |
|---|---|---|
| Patches | 512 in 4 banks of 128; A and B factory, C and D user | p. 11 |
| Factory patches at v1.2 | 286, plus 226 user slots | p. 4 |
| Arp tempo | 40-240 BPM | p. 30 |
| Arp swing | 20-80, default 50 | p. 30 |
| Arp octaves | 1-6 | p. 30 |
| Arp rhythms | 33 | p. 30 |
| Arp types | 7 | p. 30 |
| Display timeout | 10 minutes | p. 12 |
| Parameter message time | max ≈ 3 s at value 127 | p. 34 |
| MIDI CC/NRPN modes | Disabled, Receive, Transmit, Rec+Tran | p. 35 |
| Program/bank change modes | same four | p. 35 |
| SysEx backup granularity | Current, Bank A-D, A+B+C+D, Settings, ABCD+Set | p. 36 |

## Not worth copying

**The 0-127 parameter range everywhere.** Almost every parameter is 7-bit, with
a handful widened to 0-255 or ±127 via CC pairs (p. 40-41). That is the MIDI
wire format leaking into the data model. Our props are already floats with
`min`/`max`/`exp` in the schema, which is better, and the exponent handling in
particular ("the LFO 2 depth control is calibrated to give finer resolution at
lower parameter values", p. 18) is something we express declaratively rather
than by hand-tuning a curve per control.

**Settings that are global but saved by pressing Save inside the Settings
menu, which also silently saves the current patch as the power-on default**
(p. 34). Two unrelated things behind one gesture.

**Voice-count-limited unison.** With unison 4, "only two notes may be played
together fully polyphonically" (p. 28). We have no fixed voice budget, so the
tradeoff the manual spends two tips navigating (use SawDense instead, since it
"has no impact on the polyphony", p. 28) simply does not exist for us. Take
`SawDense`/`DenseDet` because they sound different from unison, not because they
are cheaper.

**Three reverb "types" that are just three values of one size parameter**
(p. 31). Presets pretending to be algorithms. If a parameter is continuous,
expose it.

**Auto Calibration** (p. 34). Analogue hardware maintenance.

**`Initialise` mode set to `Live`**, where pressing Initialise keeps all current
panel settings instead of loading defaults (p. 36). A global setting that
changes what a reset button means is a trap, not a feature.

## Open questions

- How the two sources in a matrix slot are combined numerically. "Multiplied
  together" (p. 26) does not say whether a bipolar source is used as -1..+1 or
  0..1 before the multiply, and the diagram does not resolve it. This matters:
  the two readings differ in sign behaviour for `Lfo1+/-` in slot input A.
- What the 33 arp rhythms actually are. The manual says only that "in very
  general terms, the sequences increase in rhythmic complexity as the numbers
  increase" and describes rhythm 1 as consecutive crotchets (p. 30). No table.
- How `Repeats` on an envelope interacts with note release mid-repeat. The
  manual states the AHD phases repeat "before the sustain and release phases of
  the envelope are implemented" (p. 23) but not what happens if the key is
  released during the third of ten repeats.
- Whether `Slew` is applied before or after `Repeats` and `FadeMode` in the LFO
  chain. All three are described independently (p. 21) with no ordering.
- What determines voice stealing order when it does occur. The manual introduces
  the term (p. 27) and gives one example where "one voice from the first chord
  will be stolen, which may be the lowest A" (p. 29). "May be" is the whole
  specification.
- The `Noise HPF` parameter appears in the MIDI table as NRPN 0:12 with a range
  of "0-0" (p. 40) and is described nowhere in the manual. Either vestigial or
  undocumented.
- Whether the per-voice LFOs 1 and 2 are still per-voice when `Common` is On, or
  whether that collapses them to one shared oscillator. The manual says only
  that Common "ensures that the phase of the LFO waveform is synchronised for
  every note being played" (p. 21), which is consistent with both
  implementations.
