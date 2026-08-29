# Teenage Engineering OP–1 field user guide

Source: `docs/untracked/OP–1 field guide - teenage engineering.pdf` (untracked
local copy; a PDF export of the guide at teenage.engineering/guides/op-1)
Version/date on the document: firmware version 1.6 (p. 82). No publication date
printed.
Read: pages 1-84. Pages 85-86 are the website footer (shipping banner, contact
links) and carry no guide content.

The guide has **no printed page numbers**, so every citation below is a PDF page
number. Pages 1-5 and 83-84 carry a text layer; pages 6-82 are page images, read
as rendered images.

## What it is

A battery-powered portable synthesizer, sampler and four-track tape recorder in
one aluminium case. The workflow is deliberately linear: pick a synth or drum
sound, play it, record it to tape, layer, then mix. "the OP–1 workflow is based
around playing, recording and layering sounds on tape. the four main modes:
synth, drum, tape and mixer are where you'll spend the most time" (p. 11).

Interesting to us because it is the only device in this folder that is **not**
built on a step sequencer. Its primary recording surface is audio tape, and its
seven sequencers are optional modules layered on top. That inversion is the main
finding.

## Overlap

**A preset is a fixed set of four modules.** "a preset consists of all four
modules: T1 engine, T2 envelope, T3 FX, T4 lfo" (p. 14), on four dedicated keys,
identical in synth and drum mode. Our `Track` has `source`, `amp`, `filter`,
`lfo1`, `fx1`-`fx4`, `trackGain`. Theirs is smaller and rigidly uniform: always
exactly four slots, always the same four keys, no filter slot at all (filtering
lives inside whichever engine provides it). The uniformity is the point, and it
is what makes "shift + T1 changes only the engine, shift + 1-8 changes all four"
(p. 16) a coherent rule rather than a special case.

**Swappable synth engines.** Cluster, digital, dimension, dna, dr wave, dsynth,
fm, phase, pulse, sampler, string, voltage, vocoder (pp. 18-24). Each exposes
exactly four encoder parameters, colour-coded to four physical knobs. Directly
comparable to our `blocks/source/` set, and the same idea the Digitakt II calls
machines (`elektron-digitakt-ii.md`, p. 17). The difference: OP–1 gives every
engine the *same* four-knob budget, so engines are interchangeable at the UI
level, not just the data level.

**ADSR envelope.** Attack, decay, sustain, release on the four encoders,
described as "an adsr envelope is the second (T2) module of a synth" (p. 27).
Same shape as our `Envelope` minus the attack curve.

**Effects.** Ten stereo effects, one at a time per sound (p. 28): cwo, delay,
grid, mother, nitro, phone, punch, spring, terminal, and one more. Each is again
exactly four parameters. We allow four insert slots per track, so ours is more
capable; theirs is a hard one-at-a-time budget (see Not worth copying).

**Mixer with per-track level, pan and mute**, plus a three-band master EQ and a
master output stage (p. 48). Comparable to our track gain and master track work.
Their EQ bands are fixed at 100 Hz, 1 kHz and 10 kHz (p. 49).

**Tempo and external sync.** Free, beat match, midi sync, PO sync and 1/16 sync
(p. 57). Our transport has internal and external clock. Theirs adds the pocket
operator sync convention, where "the output signal is split into dual mono, L
being the sync signal and R the audio mix" (p. 58).

**MIDI CC control of internal parameters** (p. 84), covered under Constraints.

## Gaps

**Tape, not a sequencer, as the primary recording surface.** The distinction is
stated outright: "the big difference between the tape and a sequencer is that
tape records audio, while a sequencer stores note data. one of the reasons for
using a sequencer is that you may change or alter the sound but continue playing
the same stored notes" (p. 52). Four stereo tracks, six minutes each, eight tapes
in memory (p. 44). We have no audio recording surface at all beyond
`AudioRecorder`; every other device in this folder sequences events. Cost of
adopting: a real multitrack audio buffer with an edit model, which is a large
piece of work and would want its own design doc.

**Six tape edit verbs, all undoable.** Lift, drop, split, join, plus undo and
redo on a modifier (p. 45). Then two compound forms: "lift all lets you lift all
four tracks within an active loop. merge drop will drop them on a single track,
merged. join joins two nearby takes from the same track" (p. 46). Note the
vocabulary: a *take* is the unit, lift removes it to a clipboard, drop places
"the last take stored in memory". Cut/paste for audio expressed as physical tape
handling, with a one-level clipboard rather than a stack.

**The same eight keys mean different things per mode, and the guide names the
second meaning.** In synth and drum mode keys 1-8 are preset slots; in tape and
mixer mode they are "tape tricks - a collection of functions made to interact
with the tape or the mixer" (p. 46): loop in, loop out, loop on/off, break,
reverse, chop ("a tempo locked repeat effect"), and two memo slots that
"memorize any parameters" (p. 46). Compare the Digitakt II's trig modes, where
the same grid also has five meanings (`elektron-digitakt-ii.md`, p. 27). OP–1
gets there with no mode selector: the meaning follows the mode you are already
in.

**Seven sequencers as swappable modules, with two independent memories.**
Arpeggio, endless, finger, hold, pattern, sketch, tombola (p. 53). "both
synthesizer and drum mode have their own dedicated sequencer memory and can have
separate types active, even though only one can be played at a time" (p. 52).
Three are unlike anything we or the Elektrons have:

- **tombola**: a physics simulation. Parameters are rotation speed, heaviness,
  shape, bounciness, plus a manual mode and a g-force input (p. 56). Notes fall
  inside a rotating polygon and sound when they hit a wall.
- **sketch**: draw a shape on an x/y grid and the drawing becomes the sequence,
  with draw x, draw y, move x, move y, erase, use divider, use grid (p. 56).
- **finger**: a two-hand pattern builder with a JOIN control between two halves
  (p. 54), with a drum variant (p. 55).

Plus **hold**, which is not a sequencer in the usual sense at all: break point,
mono/poly, transpose, hold (p. 55): a keyboard splitter and latch.

Cost for us: each is small on its own. The transferable idea is that "sequencer"
is a *slot* with interchangeable implementations, exactly as source and filter
are, rather than one fixed step grid.

**Element LFO: modulation sourced from the physical world.** The LFO slot can be
filled by an LFO whose input is not an oscillator (p. 35):

- **g-force**: "allows you to affect a parameter by physically tilting your
  unit. shake the sound."
- **external input**: "(mic / line in / radio / usb) can be used as the input
  source for the lfo", and if radio is selected "you may tune in to a radio
  station for interesting results."
- **envelope**: "means the envelope (T2) is the lfo input source."
- **sum**: "whatever sound is sent to main out will be the lfo input source."

`sum` in particular is an audio-rate feedback path from the master bus into a
modulation destination. None of the other manuals in this folder offer anything
like it. Peak's CV input is the nearest equivalent (`novation-peak.md`, p. 27)
and it needs a cable.

**The LFO slot itself has six different kinds, not six waveforms.** Random,
element, midi, tremolo, value, velocity (pp. 34-38). Each exposes a different
parameter set:

- **midi lfo**: "lets you receive external midi control change data (midi cc) to
  control parameters within OP–1 field... use midi cc 1-4 from the external
  source and use the encoders to assign the internal parameter destinations"
  (p. 36). Four assignable CC-to-parameter routes living in the modulation slot.
- **velocity lfo**: "takes keyboard velocity and translates that into lfo data"
  (p. 39), with a second option for volume.
- **value lfo**: modulates a single parameter, and its destination "offers the
  lfo synced to whenever a note is triggered, or running free, based on the
  internal tempo" (p. 38).
- **tremolo lfo**: pitch and volume together, with five shapes, and "these
  parameters can have negative values, effectively inverting the lfo shape"
  (p. 37).

So "modulation" is one slot with six implementations rather than one LFO with
many settings. That is a cleaner factoring than ours and it costs nothing
structurally: our `LfoBlock` is already a block.

**The sound path screen.** A live signal-flow diagram of the whole instrument,
on a key combination (p. 51). Its best feature is diagnostic: "a warning symbol
will light up when any critical level is set to zero." The rendered chain is
synth/drum → FX → tape 1-4 → mixer → sum → eq-bus → fx-bus → master → amp /
headphones (p. 51), with warning triangles on the stages that are muted. A
"why is there no sound" answer built into the UI. Cheap for us, and directly
useful given our patch graph.

**Drum envelope is a transient processor, not an ADSR.** "in drum mode you get a
transient processor that allows you to control and shape the attack and release
of your percussion sounds" with attack, gain, release and timing, where timing
"controls the overall timing of the attack and release" (p. 43). Same slot, same
four knobs, entirely different algorithm chosen by context.

**Randomize and revert as one-key gestures.** "to randomize a preset once it is
loaded, hold shift and press drop. this lets you explore the rich sound of OP–1
field in new, unique ways. once you hear something you like, you can save it as a
new preset" (p. 14), and separately a revert: "discard any changes done to the
active sound and revert to its saved preset" (pp. 46-47). Randomize paired with
revert, the same pairing the Elektrons need for their page randomizer to be safe
(`elektron-digitone.md`, p. 45).

**Snapshots named by date, stored as audio files.** "hold the corresponding sound
key for two seconds. a file will be stored in the internal 'snapshot' folder,
with its name based on the internal date" (p. 15), and "the snapshot presets are
stored as audio files in the 'snapshot' folders for synth and drum respectively"
(p. 68). Presets serialised into the audio format rather than a patch format,
which is why the device has a real-time clock in its settings (p. 65).

**No save step at all for the project.** "data is stored automatically, so you
don't have to worry about saving. the next time you power on your OP–1 field,
everything will still be there, exactly as you left it" (p. 10). The Octatrack
reaches the same conclusion and keeps an explicit save purely as a restore point
(`elektron-octatrack-mkii.md`, p. 18); OP–1 does not even do that.

**Mixdown: capture a performance, not a pattern.** "mixdown will capture what you
are doing. once your performance is complete, hit T2... your two recordings are
stored as 6-minute audio files, available when you connect via usb" (p. 60). Two
slots, side A and side B. And a routing subtlety worth noting: the master effect
"will not be recorded to tape but will be recorded during output mixdown"
(p. 28).

**Output to input as an input source.** Listed alongside mic, line, radio and
usb as "output to input / resample (ear)" (p. 59). Internal resampling as a
first-class input rather than a special mode.

**FM radio in both directions.** The radio is an input source, a vocoder carrier
and an LFO source (p. 24, p. 35, p. 59); it is also an *output*, transmitting
whatever is playing over the FM band (p. 61), with automatic frequency sync to a
nearby OB-4 receiver.

**A MIDI monitor in the settings menu.** "a handy midi monitor for your studio.
connect a class-compliant usb midi device, and monitor its midi output" (p. 66),
showing incoming message, channel and value with clock/sense/sysex indicators.
A device that ships with a debugging tool for other devices.

**Per-connected-device MIDI filtering.** The device list shows each connected
BLE/USB peer with independent clock, notes, other and timestamp settings
(p. 67). Filtering per peer rather than per port.

**Encoders relative or absolute**, as a setting, when acting as a MIDI
controller (p. 66). The two conventions our `LaunchControlXL3RelativeEncoder`
has to pick between, exposed as a user choice.

**Keyboard detune as a global feel setting.** Settings hold "detune cents" and
"detune notes" (p. 65), a per-note-index detune applied across the keyboard,
distinct from any per-patch detune.

**A count-in tied to arming, and a tempo-derived edit grid.** "pressing play
while recording is armed will give you a count in, based on your current tempo.
the tape grid is also based on the current tempo; from 1 bar, down to 8th note
steps" (p. 46).

## Constraints

### Tape and recording

| Thing | Value | Cite |
|---|---|---|
| Tracks per tape | 4 stereo | p. 44 |
| Recording time per track | 6 minutes at normal tape speed | p. 44 |
| Tapes in memory | 8 | p. 44, p. 47 |
| Tape resolution | 32-bit | p. 47 |
| Tape styles | 4: studio 4-track, vintage 4-track, porta 4-track, disk mini | p. 47 |
| Studio 4-track speed | 15 inch/second | p. 48 |
| Vintage 4-track speed | 7.5 inch/second | p. 48 |
| Porta 4-track speed | 3.75 inch/second | p. 48 |
| Disk mini | magneto-optical, psychoacoustic compression | p. 48 |
| Tape edit grid | 1 bar down to 8th note steps, tempo-derived | p. 46 |
| Mixdown slots | 2 (side A / side B), 6-minute audio files | p. 60 |

### Sound

| Thing | Value | Cite |
|---|---|---|
| Preset slots per mode | 8 (keys 1-8) | p. 14 |
| Preset modules | 4: engine, envelope, FX, LFO | p. 14 |
| Synth engines | 13 named in the index | p. 4, pp. 18-24 |
| Drum engines | 2: drum sampler, dbox | p. 40 |
| Stereo effects | 10, one active at a time per sound | p. 8, p. 28 |
| LFO kinds | 6: random, element, midi, tremolo, value, velocity | pp. 34-39 |
| Sequencers | 7: arpeggio, endless, finger, hold, pattern, sketch, tombola | p. 8, p. 53 |
| Master EQ bands | 3, at 100 Hz / 1 kHz / 10 kHz | p. 49 |
| Tremolo LFO shapes | sine, saw, exp, square, blip | p. 37 |
| Value LFO shapes | square, ramp, saw, sine | p. 38 |
| midi lfo routes | 4 (CC 1-4 to four destinations) | p. 36 |

### Hardware and I/O

| Thing | Value | Cite |
|---|---|---|
| Audio in | 3.5 mm stereo jack | p. 74 |
| Audio out | 3.5 mm stereo, headset mic support | p. 74 |
| Audio input impedance | 13 kOhm | p. 75 |
| Audio input analog gain | 0-31 dB | p. 75 |
| Audio input max level | 8 dBu, 2 Vrms | p. 75 |
| Audio input SNR | 98 dBA typical | p. 75 |
| Audio output max level | 8 dBu, 2 Vrms | p. 75 |
| Audio output SNR | 124 dBA typical | p. 75 |
| USB audio modes | 2 ch stereo; 8 ch tape 1-4; 10 ch main + tape 1-4 | p. 64 |
| USB | audio class 2.0 device, MIDI host and device | p. 74 |
| Bluetooth LE | 2402-2480 MHz, < 10 dBm | p. 74 |
| FM transmitter | 87.5-108 MHz, -49.56 dBm | p. 74 |
| FM receiver | 87.5-108 MHz | p. 74 |
| Battery life | 24 hours | p. 74 |
| Charge interval to stay healthy | at least every 6 months | p. 9, p. 75 |
| Working temperature | 10-35 °C | p. 75 |
| Model number | TE002AS002 | p. 76 |

### Incoming MIDI (p. 83)

| Message | Channel | Function | Value |
|---|---|---|---|
| note on | 1-16 | play synth/drum note | velocity 1-127 |
| note off | 1-16 | release note | - |
| pitch bend | 1-16 | synth pitch bend | 0-16383 |
| program change | 1-16 | load synth/drum slot | 0-7 = synth slots 1-8; 8-15 = drum slots 1-8 |
| clock | - | sync input | - |
| start | - | start tape playback | - |
| continue | - | continue tape playback | - |
| stop | - | stop tape | - |
| song position | - | set sequencer position | - |

### Incoming MIDI control change (p. 84)

| CC | Channel | Function | Value |
|---|---|---|---|
| 7 | 1-4 | mixer volume | 0-127 |
| 9 | 1-4 | mixer mute | ≥ 64 = muted |
| 10 | 1-4 | mixer pan | 0-127 |
| 46-49 | any | synth parameters 1-4 / drum active key pitch, loop in, loop out, play mode | 0-127 |
| 50-53 | any | synth envelope A/D/S/R; drum envelope attack, gain, release, smooth | 0-127 |
| 54-57 | any | patch fx parameters 1-4 | 0-127 |
| 58-61 | any | patch lfo parameters 1-4 | 0-127 |
| 62 | any | randomize active patch | ≥ 64 |
| 63 | any | reset active patch | ≥ 64 |
| 64 | any | sustain pedal | ≥ 64 = down |
| 70-73 | any | master fx parameters 1-4 | 0-127 |
| 74-77 | any | master compressor parameters 1-4 | 0-127 |
| 78 | any | tape record level | 0-127 |
| 79 | any | octave | < 64 = down, ≥ 64 = up |
| 80 | any | tempo | 0-5 → 40-50 BPM; 6-120 → 52-166 BPM; 121-127 → 168-180 BPM |
| 81 | any | metronome level | 0-127 |
| 82-88 | any | tape: previous bar, next bar, jump to start, jump to end, set loop in, set loop out, toggle loop | ≥ 64 |
| 90-92 | any | master eq low / mid / high | 0-127 |
| 93 | any | mode select | < 64 = synth, ≥ 64 = drum |

The tempo mapping on CC 80 is the notable one: a deliberately non-linear
piecewise map that spends most of the 7-bit range on 52-166 BPM and compresses
the extremes.

## Not worth copying

**One effect at a time per sound.** "one effect at a time can be active"
(p. 28). A DSP budget on a battery-powered ARM device. We run four insert slots
per track and should not regress to imitate the workflow. Same objection as the
shared send buses on the Elektrons.

**Only one sequencer active at a time**, despite synth and drum having separate
sequencer memories (p. 52). Another budget constraint dressed as a rule.

**Eight preset slots on the number keys.** Presets beyond the eight live in a
browser and must be loaded into a slot first (p. 14). The eight-slot limit is the
width of the key row.

**Six minutes of tape.** (p. 44.) Fixed RAM.

**Mixdown as exactly two slots, A and B.** (p. 60.) Two, because the metaphor is
a record with two sides.

**Master effect recorded on mixdown but not to tape** (p. 28). A signal-flow
asymmetry that follows from the tape being pre-master, and one a user has to
learn rather than see. Our sound-path equivalent should make this visible if we
ever have the same split.

**Parameters named for the picture rather than the function.** "digitalness",
"unitor", "telemetry", "baud", "gsm", "rounds", "power", "heaviness" (pp. 18-33,
p. 56). Charming, and genuinely unhelpful: the guide gives these no ranges, no
units and no description beyond the label. Two of the effects pages in the export
render as `???` and unreadable glyphs (p. 29), which suggests the joke extends
into the product. Name parameters for what they do.

**Snapshot presets named by internal date** (p. 15). Requires a real-time clock
to be set correctly (p. 65) for saved sounds to be findable, and produces no
meaningful name.

**Shift-key combinatorics.** Same objection as the Elektrons: the operations
behind them are worth taking, the access pattern is a symptom of a panel with no
screen space for labels.

## Open questions

- The tape sample rate. The guide states 32-bit resolution (p. 47) and never
  gives a sample rate, for the tape or for the samplers.
- What tape speed does to recorded audio. There is a tape speed encoder and a
  tape speed percentage (p. 44), and the tempo screen links song BPM to tape
  speed (p. 57), but the guide never says whether changing speed pitches existing
  recordings, and if so whether it is resampled or time-stretched.
- Polyphony. Nowhere stated for any engine. The play mode screen shows a POLY
  setting (p. 27) with no voice count.
- The LFO destination list. Element, value and velocity LFOs all have a
  destination and a parameter encoder (pp. 35-39), and the guide says
  destinations cover "synth engine, envelope, FX and main" (p. 35) without
  enumerating them.
- Pattern lengths and step counts for the pattern, finger and endless sequencers.
  Each has a "pattern length" encoder (pp. 53-55) with no stated range.
- What the tombola parameters mean physically. Rotation speed, heaviness, shape
  and bounciness (p. 56) are given no units or ranges, so the simulation is not
  reproducible from the guide.
- CC 89 is absent from the control change table, which runs 88 then 90 (p. 84).
  The guide does not say whether it is reserved or unused.
- Whether the `sum` element LFO source is taken pre- or post-master-effect. Given
  the master effect is excluded from tape but included in mixdown (p. 28), the
  tap point matters and is not stated (p. 35).
- The undo depth for tape edits. Undo and redo exist (p. 45); whether it is one
  level or a stack is never said.
