# Elektron Analog Rytm MKII

Source: `docs/untracked/Analog-Rytm-MKII-User-Manual_ENG_OS1.72_250130.pdf`
(untracked local copy of the Elektron download)
Version/date on the document: OS 1.72, filename dated 2025-01-30
Read: pages 1-114 (chapters 3-19 and appendices A, B, E in full; the machine
parameter tables in appendix D and the MIDI CC tables in appendix C sampled
rather than transcribed; printed page numbers match PDF pages)

## What it is

An analog drum machine with twelve drum tracks sharing eight analog voice
circuits, each track layering an analog percussion synth with a sample player,
then overdrive, an analog multimode filter and an amp (p. 13). A thirteenth "FX
track" holds the send effects and master effects. Same Elektron sequencer as the
Digitone, plus several things the Digitone does not have: scenes, performance
macros, song mode, retrig, euclidean generation, and four separate per-step
property layers.

Read this alongside `elektron-digitone.md`. Everything in that document's
sequencer section applies here too; this file records only what the Rytm adds
or does differently.

## Overlap

**The sequencer core is the same as the Digitone's.** Parameter locks, sound
locks, conditional trigs (identical wording and identical worked examples,
p. 48-49), fill mode, per-track length and scale with master length and change
length, three record modes, micro timing with a 0-127 quantize amount, the same
copy/paste granularities. See `elektron-digitone.md`; the differences are noted
below.

**Per-track LFO with five trig modes.** FREE, TRIG, HOLD, ONE, HALF (p. 80),
word for word the same as the Digitone. One addition worth noting: "If WAV is
set to RND then the SPH parameter will instead add slew to the transitions in
the waveform" (p. 80). A start-phase control repurposed as a slew control when
the waveform makes phase meaningless.

**Compressor with the parameters we already have.** Threshold, attack in
milliseconds, release in seconds, makeup gain (p. 83). Our `Compressor` module
covers this. Their release adds two auto modes, A1 and A2, "(A2) being slightly
longer than (A1)" (p. 83).

**Delay and reverb.** Same parameter set as the Digitone's, delay time in 128th
notes relative to BPM, ping-pong, bipolar width, feedback, HPF and LPF on the
feedback path, reverb send from the delay (p. 81). We have `Delay` and `Reverb`
as per-track blocks.

**Multimode filter with an envelope.** Seven types (p. 79). Our `Filter` has
cutoff, envelopeAmount, keyTrack, type, Q. Theirs adds a full ADSR filter
envelope with bipolar depth, and the note that "Technically all of them are
resonant 2-pole filters, but the 1-pole types have a flatter spectrum like
simple 1-pole filters and are convenient for equalizer duties" (p. 79).

## Gaps

**Scenes: a whole kit's worth of parameter locks on one pad.** Twelve scenes per
kit, one per pad. "A scene is a collection of fixed parameter locks" that can
target "Any parameter, from any of the 13 tracks" (p. 29). Only one scene is
active at a time. Budget: 48 parameters across all twelve scenes combined, in
any distribution (p. 29). This is a snapshot-and-recall mechanism at the level
of a whole instrument, not a track: the natural extension of our macro system
from "one encoder moves N parameters" to "one button sets N parameters".

**Performance macros: the same thing, but pressure-relative.** Also twelve, also
48 locks total, also stored in the kit (p. 30). The distinction is stated
precisely: "whereas scene mode locks are fixed values, performance mode locks
are modulation depth settings" (p. 30). Their worked example is the clearest
statement of offset semantics in any of these manuals: "if the general setting
is 30, a parameter lock with a modulation depth of +24 is set, and maximum
pressure is applied to the pad which contains the performance macro, the
resulting value will be +54" (p. 30). That is exactly what our `MacroMapping`
offset does, so we already have the right primitive; what we do not have is
twelve of them addressable as one-shot performance controls.

**Quick Performance: one knob driving several macros at once.** Hold a key,
select any subset of the twelve performance macros, release, and then one
physical knob drives all of them (p. 31). "Every time you perform this procedure
you remove any earlier assignments." A transient many-to-one binding. Directly
relevant to the Launch Control XL3 surface, where we have 24 encoders and more
than 24 things worth controlling.

**Retrig as a per-track and per-step property with a velocity envelope**
(p. 41-42). Four parameters:

- `RETRIG`: rate, from 1/1 to 1/80, where "1/16 is the nominal retrig rate, one
  trig per step" and 1/12 gives triplets.
- `LENGTH`: how long the retrig runs, 0.125 to INF, in fractions or multiples of
  a step.
- `VEL. CUR`: -128 to 127. "-128 corresponds to a complete fade out during the
  set length, -64 fades out to half the velocity during the set length, 0 equals
  a flat velocity curve with no fade, 64 fades into half velocity during the set
  length and 127 fades in completely to full velocity."
- `ALWAYS ON`: retrig without holding the retrig key.

Per-step retrig overrides the track default (p. 42). Compare Circuit Tracks,
where multiple hits per step are on/off toggles on six micro steps with no rate
or ramp (`novation-circuit-tracks.md`, UG p. 68). The Rytm's version is the one
worth building: a rate, a duration and a ramp is a small parameter set that
covers rolls, flams and buildups.

**Euclidean generation per track, with two generators and a boolean operator**
(p. 44). `PL1` and `PL2` set pulse counts; `R01`, `R02` rotate each generator's
output independently; `TRO` rotates the combined result; `OP` combines them with
OR, XOR, AND or SUB. Two non-obvious workflow decisions:

- Turning euclidean mode on *hides* manually placed trigs rather than destroying
  them, and they reappear when it is turned off (p. 44).
- Holding a key while turning it off *converts* the generated pattern into real
  trigs, destroying the hidden ones (p. 44).

So the generator is a non-destructive overlay with an explicit bake step. That
is the right shape, and it is cheap: a euclidean distribution is a few lines.

**Four per-step property layers, separate from the trig itself.** Each is edited
in its own mode where the trig keys toggle that one property:

- `TRIG MUTE` (p. 49): a mute mask. "If a trig mute trig is placed on the same
  sequencer step as a note trig, the note trig will be muted." A per-step mute
  that survives independently of the note, so you can silence part of a line and
  restore it without losing the notes.
- `ACCENT` (p. 49-50): per-step velocity boost with a track-level accent amount,
  and "Accent level is a destination for modulation, which means it can be
  affected by, for example, LFOs."
- `SWING` (p. 50): swing is per-step, not global. "Customize the swing pattern,
  shown by lit [TRIG] keys, using the [TRIG] keys." Every other machine here has
  one swing amount for the whole pattern; the Rytm lets you choose *which* steps
  swing.
- `PARAMETER SLIDE` (p. 50-51): "For a parameter value to slide between two
  trigs, it needs to be locked on one of the trigs. A locked parameter value will
  slide to the unlocked value and vice versa... The speed of the slide is
  relative to the current tempo, and the slide is completed when the next trig is
  reached."

Parameter slide is the answer to a question the Digitone manual left open (does
a parameter lock interpolate?): here it is explicit, opt-in, and per-step. If we
build parameter locks, this is the interpolation model to copy.

**Page playback: select which pattern pages loop, per track.** Hold a key, pick
pages 2 and 4, and only those play and loop, skipping 1 and 3 (p. 38). Then
"while holding [PAGE] press the [PADS] to exclude/include a track to be affected
by the playback selection", so some tracks follow the page selection and others
keep playing all their steps. A live-performance filter over an existing pattern
that changes nothing stored.

**Four pattern-change modes, not two.** SEQUENTIAL (at end of pattern), DIRECT
START (immediately, from the beginning), DIRECT JUMP (immediately, from the same
step index), and TEMP JUMP (p. 38-39). TEMP JUMP is the interesting one: jump to
a pattern, play it once, and automatically return. Inside a chain it substitutes:
"say that you have a chain set up like this: A01 > A03 > A04 > A02. When the
chain is playing, and you are in TEMP JUMP mode, change pattern to A16 while
pattern A03 is playing. The pattern will immediately change to A16 and once A16
has ended then the chain will continue to play from pattern A04" (p. 39).

**Song mode with rows, repeats and per-position mutes.** Songs are lists of rows;
each row holds a chain; each row has a repeat count (p. 54). Mutes are stored
*per position in the song*, not per pattern: "if for example, pattern A01 is used
in multiple places in the song and the top left instance of it is track muted,
all other instances of pattern A01 will remain unchanged" (p. 55). Three mute
layers stack, with a stated precedence: "Mutes activated in MUTE mode are the
master mutes, and they override any TRIG MUTE patterns on the sequencer or any
SONG MUTE program on any pattern of the active song" (p. 23).

**The scratch pad row.** A song always has one extra row whose "purpose... is to
enable experimentation with chains and patterns without affecting already
programmed song rows" (p. 53). Building a new chain promotes the current scratch
pad contents into a real song row and gives you a fresh empty one (p. 53). A
sketching area that is part of the document rather than a separate mode, and it
turns improvisation into arrangement without a save dialog.

**Save and reload at five granularities, each on two keys.** Kit, track Sound,
track, pattern, song. `[YES] + <mode key>` saves, `[NO] + <same key>` reloads
(p. 51-52). Combined with automatic pattern saving, this gives a manual restore
point at whatever scope you are working in: "useful in situations where an
individual track is being worked on, the results are desirable, and you want to
keep on working with the track while having the ability to revert it to a
specifically saved state" (p. 42). Note the *implicit* save is always running;
the explicit one only moves the restore point.

**Kit reload on pattern change, as a global option.** "KIT RELOAD ON CHG will
when checked cause kits to reload to their saved state automatically as soon as a
new kit becomes active. This is useful if you, for example, play live, have
tweaked a kit extensively and want it to return to its saved state automatically
next time it becomes active again" (p. 67). A one-checkbox answer to "did my live
tweaking just become permanent".

**Voice sharing declared in the data model.** Twelve tracks, eight voices: "BD,
SD, BT, and LT are independent tracks with their separate voices. Tracks RS-CP,
MT-HT, CH-OH and CY-CB, each pair is shown with a coupling on the front panel...
If you play or trigger both tracks of a coupled pair, the right-hand track has a
higher priority. Track CP mutes track RS, HT mutes MT, OH mutes CH and CB mutes
CY" (p. 21). Real hi-hat choke behaviour falling out of the voice architecture
rather than being a special case, and the priority rule is stated rather than
emergent.

**Track-level `TRK SEND MIDI`.** A per-track checkbox that makes the track send
its note on/off, length and velocity out over MIDI *in addition to* playing
internally (p. 45), rather than needing a separate MIDI track. Only those
parameters, explicitly: "Only the sequencer data for note on/off (NOT, LEN) and
VEL parameters are sent over MIDI."

**Save a Sound complete with a specific step's locks.** "Press [TRIG] + [MUTE]
(in GRID RECORDING mode) to save that trig's Sound complete with its parameters
locks added" (p. 33). Promote one step's locked state into a reusable preset.

**Solo as a modifier on mute.** Hold the retrig key and press a pad to solo it;
hold it and press several to solo several (p. 23). And preselected mutes: hold a
key, toggle several tracks, and they all take effect on release (p. 23), so a
multi-track mute change lands on one beat instead of being smeared.

**Per-track pad scale with a global override.** 36 scales (p. 110), a root note,
and `PER PATTERN` to decide whether the scale applies to all tracks or only the
active one (p. 42). Digitone has 8 scales and no such switch (`elektron-digitone.md`,
p. 35).

**Chromatic routing per Sound.** Whether chromatic play and the note parameter
affect the synth part, the sample part, both, or neither (p. 34). A layered
sound where the sample stays at fixed pitch while the synth tracks the keyboard.

**Sample start/end as a bipolar pair, with reverse for free.** "If the value of
END is lower than the value of STA, the sample will be played back backward"
(p. 78). No separate reverse switch. Plus a global high-res/low-res switch for
those two parameters, where low resolution "makes it easier to work with
pre-made sample chains and slices" (p. 67): snapping to slice boundaries by
reducing precision rather than by adding a slice editor.

**Asymmetric distortion.** `SYM` "offsets the whole signal... either up (positive
values) or down (negative values) before applying distortion. This makes
asymmetric distortion of the signal possible, fringing only the crests or the
troughs of the wave" (p. 82). One extra parameter on our `Distortion` block,
and it changes the harmonic character rather than just the amount.

**Effect return routing relative to the master effects.** The delay and reverb
returns can each be placed before or after distortion and compression
independently, with different defaults: delay defaults to PRE, reverb to POST
(p. 82). Worth noting for our master track work.

**Amp envelope hold set to AUTO.** "The AUTO setting means the hold phase is
determined by the time the pad of the drum track is physically pressed" (p. 79).
A gate-length-follows-performance mode inside an otherwise fixed envelope.

## Constraints

### Data structure

| Thing | Value | Cite |
|---|---|---|
| Projects on +Drive | 128 | p. 14 |
| Patterns per project | 128 (8 banks x 16) | p. 14 |
| Kits per project | 128 | p. 14 |
| Songs per project | 16 | p. 14 |
| Global slots per project | 4 | p. 15 |
| Drum tracks | 12, plus one FX track | p. 15 |
| Analog voices | 8, with four coupled track pairs | p. 21 |
| Sound pool per project | 128 | p. 14 |
| +Drive Sound library | 4096 (16 banks A-P x 256) | p. 14, p. 33 |
| Sample slots per project | 127, up to 64 MB (~11 minutes) | p. 14 |
| Max sampling time | 33 seconds | p. 56 |
| Chains | 64 chains sharing 256 pattern entries | p. 53 |
| Locked parameters per pattern | 72 | p. 47 |
| Scenes | 12 per kit, 48 locks total across all of them | p. 28, p. 29 |
| Performance macros | 12 per kit, 48 locks total | p. 30 |
| Kit modulation macro targets | up to 4 parameters per macro, range -128 to 127 | p. 28 |

### Sequencer

| Thing | Value | Cite |
|---|---|---|
| Steps per pattern | 16, 32, 48 or 64 | p. 46 |
| Track scale multipliers | 1/8X, 1/4X, 1/2X, 3/4X, 1X, 3/2X, 2X | p. 46 |
| Master length | up to 64, or INF | p. 47 |
| Swing | 51-80%, default 50%, per-step selectable | p. 50 |
| Quantize amount | 0-127, per track and global | p. 45 |
| Trig note | -24 to +24 semitones | p. 43 |
| Trig velocity | 1-127 | p. 43 |
| Trig probability | 0-100% | p. 43 |
| Fixed velocity default | 100 | p. 45 |
| Retrig rates | 1/1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/8, 1/10, 1/12, 1/16, 1/20, 1/24, 1/32, 1/40, 1/48, 1/64, 1/80 | p. 41 |
| Retrig length | 0.125 to INF, in fractions/multiples of a step | p. 41 |
| Retrig velocity curve | -128 to 127 | p. 41 |
| Pattern change modes | SEQUENTIAL, DIRECT START, DIRECT JUMP, TEMP JUMP | p. 38 |
| Euclidean operators | OR, XOR, AND, SUB | p. 44 |
| Pad scales | 36 | p. 110 |
| Chromatic range | 4 octaves (middle, 1 up, 2 down) | p. 23 |

### Voice parameters

| Thing | Value | Cite |
|---|---|---|
| Filter types | 2-pole LP, 1-pole LP, BP, 1-pole HP, 2-pole HP, bandstop, peak | p. 79 |
| Sample tune | -24 to +24 semitones (4 octaves) | p. 78 |
| Sample fine tune | -64 to +63, spanning one semitone each way | p. 78 |
| Sample start/end | 0-120; end < start plays backwards | p. 78 |
| Pan | -64 to +63 | p. 79 |
| LFO multipliers | 24 settings (12 tempo-synced, 12 free) | p. 80 |
| LFO waveforms | Triangle, Sine, Square, Sawtooth, Exponential, Ramp, Random | p. 80 |
| LFO start phase | 0-127 (64 is centre); becomes slew when waveform is Random | p. 80 |
| Compressor attack | 0.03-30 ms | p. 83 |
| Compressor release | 0.1-2 s, or A1 / A2 auto | p. 83 |
| Delay time | in 128th notes; 32 equals one beat | p. 81 |
| CV input range | -5 V to +5 V on tip, supplies +5 V on ring | p. 76 |
| CV zero/max level | -5.50 V to +5.50 V, independently settable | p. 67 |

### MIDI

| Thing | Value | Cite |
|---|---|---|
| Track trigger notes | MIDI 0-11 trigger tracks 1-12 on default channels 1-12 | p. 22 |
| Chromatic note range | MIDI 12-59 gives 48 chromatic variations of the active track | p. 22 |
| Program change | 0-127 selects pattern 1-128 (A01-H16) | p. 22 |

## Not worth copying

**The 72-lock and 48-lock budgets** (p. 47, p. 29, p. 30). Same memory ceiling
as the Digitone's 80, and the manual has to teach the accounting rules again.

**Sound locks restricted to the 128-slot pool while the library holds 4096**
(p. 26), and the added wrinkle that "all Sounds may not be loaded to all tracks"
because tracks drive different physical voice circuits (p. 48). That second
restriction is pure analog-hardware topology; in software any source can go
anywhere.

**Kit-versus-pattern save asymmetry.** Patterns save automatically; kits do not,
and only the active one survives power-off: "If for example, the kit linked to
pattern 1 is edited (kit A), another pattern is selected and its kit edited (kit
B) and then the power is turned off, only the changes to kit B (the most recent
active kit) will be remembered" (p. 24). The manual has to say "We highly
recommend that you specifically save the kits" in bold. Two data types in one
project with different persistence rules is a bug that got documented.

**Patterns sharing a kit non-exclusively, with no warning at edit time.** "Any
changes to the kit affect other patterns using the same kit" (p. 26), and the
mitigation is a tip telling you to save and rename the kit first. Shared mutable
state with a manual copy-on-write convention.

**Chain quick mode erasing the previous chain silently** and only working within
one bank (p. 53). Detailed mode exists and does neither.

**Twelve fixed track identities named after drums** (BD, SD, RS, CP, ...) with
machine availability determined by which physical circuit the track owns
(p. 21-22). Our block-based tracks have no such constraint.

**Randomize-a-whole-page** (p. 77), same as the Digitone. Same caveat: only
tolerable because a page-level revert sits on the adjacent key.

## Open questions

- How trig mute, accent, swing and parameter slide interact when several land on
  one step. Each is documented alone (p. 49-51); nothing states the precedence
  or whether, say, an accented step that is also trig-muted is silent.
- What a parameter slide does when the next trig has no lock on the sliding
  parameter *and* the pattern loops. "the slide is completed when the next trig
  is reached" (p. 51) does not cover the wrap.
- Whether the euclidean generators are evaluated against the track length or the
  master length when the two differ. `LEN` appears on the euclidean page but is
  described only as "available in ADVANCED SCALE mode" (p. 44).
- The rotation semantics of `R01`/`R02` versus `TRO` when both are non-zero. The
  manual says each "rotates the trigs... forward or backwards" (p. 44) without
  stating whether track rotation applies before or after the boolean operator.
- What happens to a performance macro's contribution when the pad is released
  mid-note. Pressure maps to depth continuously (p. 30), but the release
  behaviour of an already-sounding note is not stated.
- How the 48-lock scene budget interacts with the 72-lock pattern budget. They
  are described in different chapters with no statement about whether they share
  a pool.
- Whether song mutes are stored by row index or by an identity that survives
  reordering rows. The manual says mutes attach to "the pattern at a specific
  position in the song" (p. 55) and separately that rows can be moved with a key
  combination (p. 54), without connecting the two.
