# Elektron Digitakt II

Source: `docs/untracked/Digitakt-2-User-Manual_ENG_OS1.15A_250708.pdf`
(untracked local copy of the Elektron download)
Version/date on the document: "This manual for Digitakt II OS version 1.15A was
last updated July 8, 2025" (p. 11)
Read: pages 1-118 (chapters 2-14 and appendices A-D; the MIDI CC tables in
appendix B sampled rather than transcribed; printed page numbers match PDF
pages)

## What it is

A 16-track stereo sampler and sequencer. Every track is either an audio track or
a MIDI track depending on which source machine you assign it, and the audio path
is built from swappable machines: pick a sample engine, pick a filter, and each
brings its own parameter set (p. 17). 128-step sequencer, kits, song mode.

Read this alongside `elektron-digitone.md` and `elektron-analog-rytm-mkii.md`.
The parameter-lock sequencer, conditional trigs, fill mode, per-track length,
euclidean generation and retrig are all shared and documented there. This file
records what the Digitakt II adds.

## Overlap

**The Elektron sequencer, again.** Parameter locks with the same 80-lock budget
(p. 47), the same seven conditional-trig families, three record modes, per-track
length and speed, micro timing with a 0-127 quantize amount (p. 45), the same
copy/paste and temporary-save behaviour. See `elektron-digitone.md`.

**Euclidean generation** is the Analog Rytm's, verbatim: two pulse generators,
independent rotations, a track rotation, and OR/XOR/AND/SUB (p. 44). Same
non-destructive overlay with the same explicit bake gesture. Two products, one
implementation, and it has not changed.

**Retrig**, also the Rytm's, with the velocity fade rescaled from -128..127 to
-64..64 (p. 54). Same rate list, same 0.125-to-INF length.

**Per-track LFO** with the same five trig modes and the same start-phase-becomes-
slew behaviour on the random waveform (p. 59). Three of them per audio track
here, two on MIDI tracks.

**Compressor.** Threshold, attack, release, makeup, ratio, and a dry/wet mix
(p. 63-64). Our `Compressor` module covers the first four. Their ratio is a
fixed list of eight values rather than continuous.

**Delay, reverb, chorus as pattern-level sends** with per-track send amounts
(p. 61), the same topology as the Digitone including chorus feeding delay and
reverb, and delay feeding reverb.

## Gaps

**Machines: the source and the filter are swappable modules on every track.**
"A machine is a module within the Digitakt II with specific functionality. A
machine can be switched out for another machine in the same category" (p. 17),
and "Every machine has a specific set of parameters tailored to give you the most
relevant and useful sound-shaping possibilities for that particular machine."
This is very close to what our `blocks/` directory already does, since
`OscBlock`, `WavetableBlock` and `DrumMachineBlock` all fill the same slot on a
`Track`. But
Elektron takes it two steps further:

- The filter is a machine too (p. 104-108): multi-mode (morphing continuously
  from lowpass through bandpass to highpass rather than switching type),
  Lowpass 4 (24 dB), a parametric EQ with its own envelope, Comb- and Comb+
  (negative and positive feedback, described as "hollow, tube-like" versus
  "string-like"), and a Legacy filter reproducing the previous model's. Our
  `FilterBlock` wraps one `BiquadFilterNode`; a machine-per-filter model is the
  natural extension and comb filters in particular are not reachable from
  `BiquadFilterNode` at all.
- Assigning the MIDI machine to a track's source slot is what makes it a MIDI
  track (p. 17). Audio versus MIDI is not a track type, it is a consequence of
  which module is plugged in. That collapses a whole category distinction into
  the existing mechanism.

**Sample engines as separate machines, not modes.** Six, and the differences are
real algorithms rather than parameter presets (p. 93-101):

- `ONESHOT`: linear playback with start, length and a separate loop point.
- `WERP`: "The sample is cut into small time segments and played consecutively
  aligned to the tempo", with a per-segment play mode of its own (forward,
  reverse, forward loop, reverse loop).
- `STRETCH`: "chopping the audio up into tiny grains and then fading between
  them."
- `REPITCH`: tempo-match by pitch-shifting instead.
- `SLICE`: explicit slice points with a full editor.
- `GRID`: equal-size automatic slicing.

Three different time-stretch strategies exposed as three machines rather than
one algorithm with a quality knob. Each names its tradeoff in the description.

**The slice editor.** Start, end and loop per slice, with adjacent slices'
end/start points linked by default so dragging one boundary moves both, and an
explicit unlink (p. 100). Snapping to zero crossings on a modifier key, split a
slice in two, remove a slice where "Removing a slice does not remove any part of
the audio; it only removes the slice area" (p. 100). Plus two generators:
`CREATE LINEAR LOCKS` assigns slices to existing note trigs in order, and
`CREATE RANDOM LOCKS` assigns them randomly (p. 99). Slice-to-step assignment as
a one-key operation rather than manual work.

**Trig modes: the 16 keys mean different things.** A global mode selector
changing what the pad grid does (p. 27-28):

- `TRACKS`: trigger tracks 1-16 (the default).
- `VELOCITIES`: trigger the *active* track at 16 fixed velocities, 8 to 127 in
  steps of 8.
- `RETRIGS`: trigger the active track at 16 retrig rates, 1/1 through 1/80.
- `SLICES`: trigger the slices of the active track's sample, paging past 16.
- `PRESET POOL`: trigger 16 preset slots, paging through the pool.

And "All actions performed using the trig modes can be recorded in LIVE
RECORDING mode" (p. 27), so a velocity ramp or a retrig roll played on the grid
lands in the sequencer as locks. This is the most transferable idea in the
document for our Launch Control XL3 surface: one pad grid, five interpretations,
all recordable.

**Song mode as a spreadsheet.** Rows with columns for label, pattern, play
count, row length, tempo and mute, up to 99 rows, plus an always-present END row
that either stops or loops (p. 50). Details worth keeping:

- Row length is independent of pattern length, "2-1024" steps (p. 50), so a row
  can play part of a pattern or several passes of it.
- Tempo is per row by default, inherited from the pattern, "Selecting song tempo
  on any row overrides all the previously set row and pattern tempos. The swing
  settings are always set per row" (p. 50).
- `CREATE ROWS FROM CHAIN` turns an improvised chain into a song (p. 51). The
  same promote-improvisation-to-arrangement move as the Rytm's scratch pad row,
  by a different route.
- Live navigation: loop the current row on one key combination, or queue a jump
  to a specific row (p. 51).
- Clearing a row resets it to "the pattern's default BPM, length, and mute state
  settings" (p. 51) rather than blanking it.

Compare the Rytm's song mode (`elektron-analog-rytm-mkii.md`, p. 53-55), which
has rows and repeats but no per-row length or tempo.

**Perform Kit mode.** "any changes made to the preset parameters are not
auto-saved, and kits are not loaded when you change the pattern; instead, you
keep the previous (tweaked) kit. It means you can keep your parameter tweaks
over several patterns and have a smooth evolving performance without having the
kits reloaded or inadvertently saving your kit when you change patterns" (p. 52).
One toggle that suspends both auto-save and preset-reload-on-pattern-change. The
Rytm needed a global "kit reload on change" checkbox plus manual saving to
approximate this (`elektron-analog-rytm-mkii.md`, p. 67); this is the cleaner
formulation of the same problem.

**Compressor sidechain with a source selector and a filter.** `SCS` picks the
key input from: the compressor mix, everything *not* routed to the compressor,
the main output, any single track 1-16, or the audio inputs (p. 64). `SCF` is a
bipolar filter on the key signal where "Negative parameter values sets a low-pass
filer. Positive parameter values sets a high-pass filter", with the reasoning
given: lowpass makes it "react mostly to bass frequencies. Use this setting for a
characteristic pumping compressor sound", highpass avoids pumping (p. 64). Plus a
dry/wet mix for parallel compression. Our `Compressor` has no key input at all;
this is the parameter set to build toward.

**Routing switches on individual effects rather than a fixed chain.** Three of
them: `OD.RT` puts overdrive before or after the filter machine, `ROUT` does the
same for sample-rate reduction (p. 58), and `BW.RT` puts the base-width filter
before or after the filter machine (p. 56). Rather than a general routing
editor, each effect that plausibly belongs on either side of the filter carries
its own two-way switch. Cheap, and it covers most of what a routing editor would
be used for.

**Amp envelope that switches between AHD and ADSR.** `MODE` picks which, and the
parameter set changes accordingly (p. 57). In AHD mode, `HOLD` set to a number
"specif[ies] the length of the hold phase, and the envelope ignores Note Off
events such as Trig Length, releasing a [TRIG] key"; set to `NOTE` it follows
note on/off instead (p. 56). One envelope covering both one-shot percussion and
sustained playing, with an explicit ignore-note-off mode.

**Key tracking as a four-slot modulation assignment.** Not a single filter
keytrack amount: "Opens a menu where you can assign up to four parameters to the
key tracking... The depth is an offset of the original track parameter value"
(p. 39), fed by both the step's note parameter and incoming MIDI. Our
`filterKeyTrack` work handles one destination; this generalises it to the same
shape as our macro mappings.

**LFOs that modulate each other.** LFO 2 can target every parameter of LFO 1,
and LFO 3 can target both LFO 1 and LFO 2 (p. 114): speed, multiplier, fade,
waveform, start phase, trig mode and depth. Explicitly ordered so there are no
cycles. Peak's matrix allows recursive LFO modulation too (`novation-peak.md`,
p. 39) but only of rate.

**Keyboard fold.** "When set to ON, KB FOLD changes the way the notes are laid
out on the [TRIG] keys... all the [TRIG] keys trigger a note", removing the
gaps a non-chromatic scale would otherwise leave, and colouring keys that are an
octave apart differently (p. 26). The alternative to greying out unplayable keys.

**Sample identity by content hash.** "A sample that is used in a preset or a
pattern can be renamed or moved and still work as intended. This is due to a hash
function that adds a file specific value to every file, and this value is
independent of the file name or the file's location in the data structure"
(p. 29). References survive renames and moves, and the failure mode is stated
plainly: "if you delete a sample, it will not be included in any presets or
patterns anymore."

**Track swap.** Hold two track keys to exchange them completely, "together with
all settings, presets, and sequencer data" (p. 37). Reordering tracks without
copy-paste-clear.

**Parameter-page copy across tracks.** Beyond pattern, track, track page and trig
(all shared with the other Elektrons), a whole parameter page can be copied to
the same page on a different track (p. 49). Copy just the filter settings from
one track to another.

**Control All with a configurable scope.** The Digitone's Control All hits every
synth track; here a kit-level page selects which tracks participate, and
"Control all operations also affects the active track, whether it is selected to
be affected or not" (p. 37).

**Five velocity curves, including two exponentials.** OFF, LOG, LIN, EXP, and
EXP 2, where "The EXP 2 curve has a higher starting point, meaning that a low
velocity has a higher impact on the volume than on EXP" (p. 38).

**MIDI learn for CC assignments.** Hold a key on a CC-select parameter, send the
CC from the external device, and it binds (p. 104). Relevant to our controller
work: our `LaunchControlXL3` mappings are declared in code.

## Constraints

### Data structure

| Thing | Value | Cite |
|---|---|---|
| Tracks | 16, each audio or MIDI | p. 17 |
| Projects on +Drive | 128 | p. 16 |
| Kits on +Drive | 1024, one per pattern | p. 16 |
| Patterns per project | 128 (8 banks x 16) | p. 16 |
| Presets in +Drive library | 2048 (256 per bank A-H) | p. 29 |
| Preset pool per project | 128 | p. 29 |
| Sample slots per project | 1016 | p. 17 |
| Samples per project | 400 MB (~72 min mono, ~36 min stereo) | p. 17 |
| +Drive total | 20 GB | p. 29 |
| Sample format | 16-bit, 48 kHz, mono or stereo | p. 29 |
| Songs per project | 16, up to 99 rows each | p. 16, p. 50 |
| Locked parameters per pattern | 80 | p. 47 |
| Notes per MIDI track trig | up to 4 (chord) | p. 17 |
| Assignable CCs per MIDI track | 16 | p. 17 |
| Keyboard scales | 36 | p. 115 |

### Sequencer

| Thing | Value | Cite |
|---|---|---|
| Steps per pattern | up to 128 (8 pages of 16) | p. 45 |
| Track length increments | 2/16 to 128/128 | p. 47 |
| Track speed multipliers | 1/8X, 1/4X, 1/2X, 3/4X, 1X, 3/2X, 2X | p. 46 |
| Song row length | 2-1024 steps (last 25 shown as K00-K24) | p. 50 |
| Retrig rates | 1/1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/8, 1/10, 1/12, 1/16, 1/20, 1/24, 1/32, 1/40, 1/48, 1/64, 1/80 | p. 54 |
| Retrig length | 0.125 to INF | p. 54 |
| Retrig velocity fade | -64 to 64 | p. 54 |
| Velocities trig mode | 16 steps of 8, from 8 to 127 | p. 27 |
| Quantize amount | 0-127, per track and per pattern | p. 45 |
| Trig probability | 0-100%, lockable per step | p. 53 |

### Voice

| Thing | Value | Cite |
|---|---|---|
| Sample tune range | ±5 octaves | p. 93 |
| Play modes | forward, reverse, forward loop, reverse loop | p. 94 |
| SRC machines | Oneshot, Werp, Stretch, Repitch, Slice, Grid, MIDI | p. 93-101 |
| FLTR machines | Multi-mode, Lowpass 4 (24 dB), EQ, Comb-, Comb+, Legacy (12 dB LP/HP) | p. 104-108 |
| Slice grid snap values | 2, 4, 8, 16, 32, 64 | p. 99 |
| Bit reduction | 16 bits down to 1 bit | p. 58 |
| Amp envelope modes | AHD or ADSR | p. 57 |
| Hold values | 0-126 fixed, or NOTE | p. 56 |
| LFOs per audio track | 3 (2 on MIDI tracks) | p. 58, p. 59 |
| LFO waveforms | Triangle, Sine, Square, Sawtooth, Random (bipolar); Exponential, Ramp (unipolar) | p. 59 |
| LFO multipliers | 1 to 2K, against current BPM or fixed 120 BPM | p. 58, p. 60 |
| Key tracking targets | up to 4 parameters with individual depths | p. 39 |
| Velocity curves | OFF, LOG, LIN, EXP, EXP 2 | p. 38 |

### Effects

| Thing | Value | Cite |
|---|---|---|
| Delay time | 1-128 in 128th notes (1 = 1/128, 128 = one bar) | p. 61 |
| Compressor ratios | 1.50, 2.00, 3.00, 4.00, 6.00, 8.00, 16.00, 20.00 | p. 64 |
| Sidechain sources | comp mix, not-comp, main, TRK1-16, IN LR, IN L, IN R | p. 64 |
| Sidechain filter | bipolar: negative is lowpass, positive is highpass | p. 64 |
| Compressor mix | 0-127 dry to wet (parallel compression) | p. 64 |
| Routing switches | overdrive pre/post filter, SRR pre/post filter, base-width pre/post filter | p. 56, p. 58 |

## Not worth copying

**The 80-lock budget** (p. 47), unchanged from the Digitone across seven years
and a hardware generation. Still a memory ceiling, still not a design.

**Preset locks restricted to the 128-slot pool while the library holds 2048**
(p. 29), and "MIDI presets can not be added to the preset pool" (p. 30). Same
index-width constraint as the Digitone's sound locks, plus an extra carve-out.

**Send-only effects shared by every track in a pattern** (p. 61). Third Elektron
in a row; same reasoning, same conclusion. Our per-track insert chains are the
right model for software.

**Compression ratios as eight discrete values** (p. 64). Nothing about a ratio
is naturally quantised; this is a menu affordance.

**Machine-dependent MIDI CC assignments.** The CC table has entries literally
named "Data entry knob E (machine dependent)" (p. 109), so what a CC controls
depends on which machine the track has. Convenient for a fixed panel, hostile to
anything trying to control it programmatically. If we expose a control surface,
address parameters by identity.

**The pattern-page LEDs / [FUNC] key combinatorics.** Same as the other
Elektrons, same reason not to copy the access pattern rather than the operations.

**Randomize-a-parameter-page** (p. 53). Third appearance; same caveat about
needing the page-level revert on the adjacent key.

## Open questions

- What `SEG` (segment size) means numerically in the Werp machine. "The higher
  the value, the larger/fewer segments" (p. 95) is the whole specification, with
  no units, no range, and no statement of how it interacts with `BARS`.
- Whether the three tempo-matching machines (Werp, Stretch, Repitch) follow the
  song's per-row tempo or the pattern tempo when a song row overrides it. Each
  is described as stretching "to the tempo of your project or pattern" (p. 95,
  p. 96), and song rows can override both (p. 50).
- How row length interacts with per-track lengths that differ. A song row length
  of 2-1024 steps (p. 50) is described against "the selected pattern", but in
  per-track mode there is no single pattern length.
- Whether LFO-modulating-LFO is evaluated per sample or per step, and what
  happens when LFO 3 modulates LFO 2's trig mode mid-cycle. The destination list
  permits it (p. 114); nothing describes the semantics.
- What the multi-mode filter's `TYPE` morph does at its midpoint. "Type morphs
  the multimode filter from Lowpass to Bandpass to Highpass" (p. 105) does not
  say whether it crossfades outputs or moves poles.
- Whether preset locks and slice `SAMP` locks count separately against the
  80-parameter budget. Sample slot appears as a lockable parameter (p. 94) and
  preset locks are described separately (p. 48), with no statement about the
  accounting.
- The interaction between Perform Kit mode and song mode. Perform Kit suppresses
  kit loading on pattern change (p. 52), and songs change patterns on their own;
  the manual never addresses the combination.
