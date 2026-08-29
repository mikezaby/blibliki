# Novation Circuit Tracks

Source: `docs/untracked/circuit_tracks_user_guide_v3_en.pdf` and
`docs/untracked/circuit_tracks_programmer_s_reference_guide_v3.pdf` (untracked
local copies of the Novation downloads)
Version/date on the document: both printed "Version 3"; user guide carries
"2022 © Focusrite Audio Engineering Limited" (p. 109)
Read: user guide pages 1-109, programmer's reference pages 1-22

Page citations below are `UG p. n` for the user guide and `PR p. n` for the
programmer's reference. Printed page numbers match PDF page numbers in both.

## What it is

A battery-powered hardware groovebox with a 32-pad RGB grid and eight encoders.
Eight tracks: two 6-voice digital synths, four sample-based drum tracks, and two
MIDI tracks that sequence external gear while mixing that gear's audio back
through two line inputs (UG p. 5, p. 57). Aimed at getting a loop going fast
with no screen, then chaining loops into a song without leaving the grid.

## Overlap

**Step sequencer with per-step velocity, gate and probability.** Ours has
`IStep` with `notes`, `ccMessages`, `probability`, `microtimeOffset` and
`duration` (`packages/transport/src/sources/StepSequencerSource.ts`). Theirs is
the same shape with different resolutions:

- Probability is eight discrete values, 12.5% apart, because the meter is a
  row of eight pads (UG p. 47). Ours is continuous, plus a `probabilityAmount`
  global scaler theirs has no equivalent of. Theirs is worse, and worse for a
  hardware reason we do not have.
- Gate is expressed *in steps*, from 1/6 to 16 in sixths, 96 values, so a gate
  of 16 sounds for a whole 16-step pattern (UG p. 45). Ours is a `Division`,
  absolute musical time. Theirs is the better call for a step grid: the note
  length stays correct when the track's sync rate changes (UG p. 55-56), where
  ours would not.
- Velocity is 7-bit internally, displayed in 16 increments of 8 (UG p. 42).
  Per-note velocities within one step are kept independently, and Velocity View
  shows the range at that step as bright-pad low and dim-pad high (UG p. 44).
  We already store velocity per `IStepNote`, so this is parity.

**Per-step micro timing.** Theirs subdivides the step into six ticks and stores
the tick *per note*, not per step, so a chord can be strummed (UG p. 49-51).
Ours is one `microtimeOffset` for the whole step, -50 to +50 ticks. Ours has
finer resolution; theirs is per-note, which ours cannot express.

**Pattern chaining.** Theirs chains only numerically contiguous patterns, hold
lowest pad then press highest (UG p. 76). Ours takes an arbitrary sequence
string like `"2A4B2AC"`. Ours is strictly more capable; Scenes exist on the
Circuit largely to work around this limit (UG p. 84).

**Macros.** Eight encoders. Each macro has exactly four destinations A-D, each
with a start position, end position and depth (PR p. 5-8). Polarity is
unipolar or bipolar, and the manual is explicit that polarity "only affects the
response of the LED below the control and does not affect the transmitted
messages" (UG p. 58). Our `MacroEncoder` takes an unbounded `mappings` array
with `min`/`max`/`exp`/`inverted`, and our polarity actually changes the value
range (`reduceMacroValue`, rest at 0, bipolar swings -1 to +1). Ours is a
superset except for `exp`, which they do not have at all.

**Mixer.** Per-track level 0-127 defaulting to 100, pan, and mute, all
automatable, with level and pan sharing the eight encoders via a page toggle
(UG p. 88-89). Comparable to our track gain and master track work.

**Scale/root as a live, non-destructive transform.** Sixteen scales and a root
note, changeable *during playback*, applied to both synth tracks and both MIDI
tracks at once (UG p. 30-33, p. 36). Notes outside the new scale are remapped,
"normally either one semitone above or below the original note", and reverting
restores the originals (UG p. 33). Note our `Scale` module is a value scaler,
not a musical scale, so despite the name there is no overlap here at all; see
Gaps.

**Per-track MIDI channel and per-category Rx/Tx.** Note, CC, Program Change and
Clock each have independent receive and transmit toggles (UG p. 104). Tracks
are assignable to channels 1-15, channel 16 is reserved for project-level
control, and "no two tracks can transmit on the same MIDI channel" (UG p. 103).
We have `MidiChannelFilter` and `MidiInput`/`MidiOutput`; the per-category
Rx/Tx split is finer than what we do.

## Gaps

**Scenes.** Sixteen pads, each storing the set of pattern chains for *all eight
tracks* at once, so one pad triggers a section of a song. Scenes then chain to
each other to make the arrangement (UG p. 81-83). Assigning a scene mid-play
does not disturb playback: "the selected Scene will start when the current
Pattern or Pattern Chain is completed" (UG p. 83). A queued scene "flashes
green and at the end of the Drum 1 Pattern currently playing, the new Scene
will begin playing from the start without losing sync" (UG p. 84). Cost for us:
a song-arrangement layer above `patternSequence`, plus a queue point that is a
policy decision rather than something we can copy (theirs hard-codes Drum 1).

**Per-track pattern start point, end point, play order and sync rate.** Any
track can have any length up to 32 steps with independently movable start and
end points, so "sub-sections of a Pattern, of any length, may be played against
other tracks with different Pattern lengths" (UG p. 53). Play order is
forwards, reverse, ping-pong or random (UG p. 55). Sync rate is a per-track
multiplier of project BPM across 1/4, 1/4T, 1/8, 1/8T, 1/16, 1/16T, 1/32, 1/32T
(UG p. 56). We have a single `loopLength` and one `resolution` for the whole
sequencer, so we cannot do polymetry at all. Changes take effect at the end of
the current cycle, never mid-cycle (UG p. 55, p. 56). Cost: `loopLength` and
`resolution` move from sequencer-level to track-level, and steps outside the
current window must be *retained* rather than deleted, since shortening only
dims them and reselecting the old end point brings the data back (UG p. 53).

**Retrig via micro steps.** Each of the six micro steps is an independent on/off
per step on a drum track, so one step can fire the same sample three times, "once
on the beat and twice more two and four ticks later" (UG p. 68). All micro-step
hits inherit the step's velocity and sample (UG p. 68). Cost for us: micro
timing changes from one scalar offset to a set. Cheap, and it is the single
highest-value item on this list relative to its size.

**Tie-forward as an explicit per-step flag.** Not a long gate: a separate
tie-forward toggle on the step, which joins to a note of the same pitch at the
start of the next pattern in the chain, so a drone survives the pattern boundary
(UG p. 51-52). Newly added notes on a tied step do not inherit the tie, "which
ensures that overdubbing on a step with a tied note does not result in multiple
ties" (UG p. 52). Cost: one boolean on `IStep` plus note-joining logic at the
pattern boundary. The overdub rule is the part worth copying verbatim.

**Mutate.** Shuffles the existing notes/hits of the current pattern onto
different steps. "The number of notes/hits in the Pattern, and the synth notes
or drum samples themselves are both unchanged, they are merely reassigned to
different steps. All step parameters are reassigned by Mutate, including micro
steps, gate values, sample flips, probability and automation data" (UG p. 56).
Per-track, affects only the currently playing pattern in a chain. Cost: near
zero. It is a permutation of the step array.

**View Lock.** Freezes the step display on one pattern (and one 16-step page)
while a different pattern or a whole chain keeps playing, so you can edit
pattern 3 while pattern 1 plays (UG p. 80). Explicitly not saved: "It will
default to 'inactive' whenever Circuit Tracks is powered on" (UG p. 80). Cost:
the editor needs a viewed-pattern separate from the playing-pattern, which is a
grid-app state split we currently do not have.

**Automation recorded against steps, independently of note data.** Turning an
encoder in record mode writes automation at the step under the cursor. With the
sequencer stopped you hold a step pad and turn the knob to write automation at
exactly that step (UG p. 37). Crucially: "automation data is recorded
independently of Pattern data... You can tweak the drum sound at a specific
step and then change the sample at that step: the tweak will still be
effective" (UG p. 71). Deleting is hold Clear and move the knob at least 20% of
its rotation, and it clears that macro for the whole pattern, not just the
current step (UG p. 37). Cost: an automation lane per macro per pattern, keyed
by step, separate from `IStep`. This is the piece that makes their macros feel
like an instrument rather than a mixer.

**Non-quantised record.** A record-mode toggle that places live-played notes on
the nearest *micro* step instead of the nearest step (UG p. 37, p. 64). Cost:
trivial once micro steps exist.

**Queued-versus-immediate switching, with step continuity.** The default for
patterns, scenes and whole projects is to finish the current pattern first;
holding Shift switches instantly *and preserves the step index*: "if the current
Pattern had reached Step 11 when you press a second Pattern's pad while holding
down Shift, Circuit Tracks will remember where the cursor is, and the second
Pattern will start playing from Step 12" (UG p. 74). Same rule for projects
(UG p. 95). Shift+Play also resumes from the stopped step instead of restarting
(UG p. 74). Cost: a queue with a resolution point, plus carrying the step index
across the switch.

**Sample flip: per-step sample override.** A drum track has one active sample,
but any individual step can override it, either live-recorded or by holding a
sample pad and tapping steps. "This is a very powerful feature as it overcomes
the one-sample-per-track restriction" (UG p. 62-63). Flipped steps light pink
instead of blue so the exception is visible on the grid. Cost for us: an
optional per-step source override on a `DrumMachineBlock` track.

**Muting frees the step pads for performance.** "When a track is muted, its
sequencer step pads become inactive. However, they then become available to play
synth notes or chords, or drum hits, in real time", giving 16 pads that trigger
whatever notes are programmed at those steps (UG p. 89). A mute is repurposed as
a performance mode rather than just a silence. Relevant to the Launch Control
XL3 surface.

**Tempo behaviour on project load.** "Projects loaded when the sequencer is not
running will play at the tempo that was in force when the Project was saved.
Projects loaded while the sequencer is running will play at the tempo that is
currently set" (UG p. 22). One rule, and it is the right one for a live set.

**Save Lock.** Hold Shift+Save at power-on to disable saving entirely, so a
prepared live set cannot be overwritten by accident; the state survives power
cycles (UG p. 107). Cheap, and the reasoning transfers directly to a performance
mode in the grid app.

**Patch preview honours the current scale and root** when auditioning, and is
suppressed both by holding Shift and automatically whenever record is armed
during playback (UG p. 33-34).

## Constraints

### Sequencer

| Thing | Value | Cite |
|---|---|---|
| Tracks | 8 (2 synth, 2 MIDI, 4 drum) | UG p. 5 |
| Patterns per track per project | 8 | UG p. 73 |
| Pattern length | 16 or 32 steps default; any length up to 32 via start/end | UG p. 53, p. 75 |
| Max chain length | 256 steps (8 patterns x 32) | UG p. 79 |
| Micro steps per step | 6 | UG p. 11, p. 48 |
| Micro-step note delay range | 1 to 5 ticks (tick = 1/6 step) | UG p. 48 |
| Gate range | 1/6 to 16 steps, in 1/6 increments; 96 values | UG p. 45 |
| Velocity | 0-127 internally; 16 display increments of 8 | UG p. 42 |
| Fixed velocity value | 96 | UG p. 43, p. 69 |
| Probability values | 8: 100, 87.5, 75, 62.5, 50, 37.5, 25, 12.5 % | UG p. 47 |
| Notes per step (synth) | up to 6 | UG p. 35, p. 49 |
| Synth polyphony | 6 voices | UG p. 6, p. 35 |
| Play orders | forwards, reverse, ping-pong, random | UG p. 55 |
| Sync rates | 1/4, 1/4T, 1/8, 1/8T, 1/16, 1/16T, 1/32, 1/32T; default 1/16 | UG p. 55-56 |
| Scenes | 16 per project | UG p. 81 |
| Scales | 16, incl. chromatic (12 notes); all others 8 or fewer | UG p. 30 |
| Synth keyboard range | 10 octaves; octave shift +1..+5 / -1..-6 from note view | UG p. 17, p. 28 |

### Timing

| Thing | Value | Cite |
|---|---|---|
| Internal tempo | 40-240 BPM, integers only; default 120 | UG p. 85 |
| External sync range | 30-300 BPM, fractional accepted | UG p. 85 |
| Tap tempo | min 3 taps, averages last 5 | UG p. 86 |
| Swing | 20-80, default 50; shifts even steps only | UG p. 86 |
| Swing on analogue clock out | not applied | UG p. 105 |
| Analogue sync out | 1, 2, 4, 8 or 24 ppqn; default 2; 5 V | UG p. 18, p. 105 |
| Click | quarter notes, global, not saved across power off (level is saved) | UG p. 87 |

### Storage

| Thing | Value | Cite |
|---|---|---|
| Projects per pack | 64 | UG p. 22, p. 97 |
| Synth patches per pack | 128 (4 pages of 32); 64 addressable by PGM | UG p. 33, PR p. 10 |
| Drum samples per pack | 64 | UG p. 62, p. 97 |
| MIDI templates | 8 | UG p. 57 |
| Packs | 1 internal + 31 on card = 32 | UG p. 97, p. 99 |
| Project colours | 14 | UG p. 23, p. 96 |
| microSD | Class 10 minimum, FAT32 | UG p. 100 |

### MIDI

| Thing | Value | Cite |
|---|---|---|
| Default channels | Synth 1 = 1, Synth 2 = 2, MIDI 1 = 3, MIDI 2 = 4, all drums = 10 | UG p. 102-103 |
| Channel 16 | reserved for project-level control | UG p. 103, PR p. 12 |
| Project select via PGM ch16 | 0-63 instant, 64-127 queued | PR p. 10 |
| Drum trigger notes | 60, 62, 64, 65 for drums 1-4 | PR p. 11 |
| Default template CCs | 1, 2, 5, 11, 12, 13, 71, 74 | UG p. 57-58 |
| Macro position CCs | 80-87 for macros 1-8 | PR p. 5-8 |
| Macro destinations | 4 per macro (A-D), each with start, end, depth | PR p. 5 |
| Mod matrix | 20 slots in the patch format; 12 exposed over NRPN | PR p. 4-5, p. 18-20 |
| Patch SysEx payload | 340 bytes; 350-byte message | PR p. 13 |
| SysEx pacing | at least 20 ms between consecutive messages | PR p. 13 |
| SysEx responses | always returned on USB, even for requests arriving on DIN | PR p. 13-14 |
| Bank file | 64 concatenated "Replace Patch" messages, patch numbers 0-63 | PR p. 14 |
| Realtime messages supported | start, stop, continue, timing clock | PR p. 10 |
| System common supported | song position pointer, song select | PR p. 10 |

### Synth engine (for reference when sizing our own blocks)

Two oscillators, 30 waveforms each (14 analogue-style plus 16 wavetables),
per-osc density and density detune, virtual sync, semitones and cents, pitch
bend range -12 to +12 (PR p. 3, p. 9). Filter has 7 drive types and 6 types
(12/24 dB low pass, 6 and 12 dB band pass, 12/24 dB high pass) plus a
Q-normalise parameter (PR p. 9). Three envelopes, envelope 3 having a delay
stage (PR p. 4). Two LFOs with 38 waveforms including stepped sequences and
chord shapes, phase offset in 3-degree steps over 0-357, slew rate, delay,
one-shot, key sync, common sync, and four fade modes (fade in, fade out, gate
in, gate out) (PR p. 4, p. 10).

Project-level sidechain per synth: source (drum 1-4 or off), attack, hold
(default 50), decay (default 70), depth (default 0) (PR p. 12). Seven presets
exposed on the grid (UG p. 93).

## Not worth copying

**One reverb preset and one delay preset for the whole project.** "It is not
possible to use different reverb presets on different tracks" (UG p. 91). That
is a DSP budget constraint on a battery-powered ARM device. We run per-track
insert chains (`fx1`-`fx4` on every track) and should not regress to a shared
send bus to imitate the workflow.

**Eight-value probability and 16-increment velocity display.** Both are
artifacts of counting pads in a row (UG p. 42, p. 47). Their own velocity is
7-bit underneath. Do not quantise ours to match a grid we do not have.

**Contiguous-only pattern chaining.** (UG p. 76.) Our `patternSequence` string
already expresses non-contiguous chains directly, which is why we do not need
Scenes to route around it. Take Scenes for the all-tracks-at-once song section,
not as a chaining workaround.

**Fixed track roles.** Two synths, four drums, two MIDI, unchangeable, with
drum tracks limited to the four even-numbered macros mapped to fixed pitch,
decay, distortion, EQ (UG p. 63). Our block-based tracks already let any track
be any source. Nothing to gain.

**Mutate being irreversible.** "Mutate cannot be 'undone'; it is a good idea to
save the original Project so that you can return to it after applying Mutate"
(UG p. 56). Copy the operation, not the missing undo.

**Sticky Shift, long-press versus short-press view latching, momentary views**
(UG p. 16-17). These solve "one button, two functions, no screen". We have a
screen.

**The automation overwrite trap.** "You must exit Record Mode before the
sequence loops, otherwise Circuit Tracks will overwrite the automation movements
you've just recorded with that corresponding to the new knob position" (UG
p. 37). A footgun that follows from continuous overwrite-on-pass recording. If
we build step automation, take the hold-a-step-and-turn editing (UG p. 37) and
leave this out.

## Open questions

- What happens to a note whose gate extends past the pattern end point, or past
  a pattern switch. The manual describes gate in units of steps up to 16
  (UG p. 45) and describes tie-forward as the mechanism for crossing a pattern
  boundary (UG p. 51-52), but does not say whether a long gate is truncated at
  the boundary.
- What a tie-forward does when the next pattern in the chain has no note of the
  same pitch at its first step. The manual only describes the case where you
  do create that note (UG p. 52).
- The storage model and resolution of automation data: how many lanes per
  pattern, what value resolution, and whether it interpolates between recorded
  points. The manual only says movements are recorded and replayed at the step
  where the knob was turned (UG p. 36-37).
- Whether swing displaces micro-step positions or only the step grid the micro
  steps sit inside. Swing is described as shifting even steps (UG p. 86), and
  micro steps as ticks within a step interval (UG p. 66), with no statement
  about their interaction.
- What the scene queue does when the Drum 1 pattern is muted, empty, or set to a
  different length than the other tracks. The queue point is stated only as "the
  end of the Drum 1 Pattern currently playing" (UG p. 84).
- The exact rule behind the scale-change remap. "Circuit Tracks makes an
  intelligent decision as to which note to play instead, which will normally be
  either one semitone above or below the original note" (UG p. 33) is the whole
  specification; "normally" is doing unexplained work, and there is no stated
  tie-break direction.
- The behaviour of the sidechain hold parameter (PR p. 12). It appears only in
  the NRPN table with a default of 50 and no description anywhere in either
  document.
