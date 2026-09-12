# AudioFollower, SampleHold and Trigger hysteresis: design

Date: 2026-09-12. Scope: the video engine and its host in grid. Context:
ADR 2 (audio reaches video as analyser data), ADR 5 (control is a route
kind), `docs/plans/2026-09-06-video-control-modules-design.md`.

## Problem

Band is the only way audio level reaches a video prop, and in practice it
does not move. Three causes, all in
`packages/video-engine/src/modules/Band.ts`:

- The decibel window is hard-coded at -100 to -30 dB. A signal off Master
  sits around -30 to 0 dB, so the output pins at 1. A quiet synth sits
  around -60 to -40 dB, so the output barely moves. Gain scales up from the
  fixed floor; it cannot move the window.
- Smoothing is one symmetric one-pole filter. Audio-reactive visuals want a
  fast attack and a slow release. Symmetric smoothing either flickers or
  smears the hits.
- There is no overall level. Setting 20 to 20000 Hz averages the dB of every
  bin, which is dominated by the many near-empty high bins, not loudness.
  The host ships frequency bins only.

Two things a patch also needs and has no module for:

- Holding a value between hits. An LFO or Noise into a shape's position
  should jump on each kick and stay put in between.
- A gate that does not chatter. Trigger's gate flips on and off around a
  sustained note that hovers at the threshold.

Setting up the same band, window and ballistics for a kick every time is
the last complaint; presets cover it.

## What already covers part of the ask

- 0..1 to -1..1: the control route's range. The module stays unipolar, as
  LFO does; the cable's out range gives swing and polarity.
- Level of one frequency band: `lowHz` and `highHz` stay as they are.
- Gate and pulse from a level: Trigger. It stays a separate module; a
  follower into a Trigger is two drops and one cable, and a gate output on
  the follower would duplicate it.

## AudioFollower

Replaces Band. The name is the modular one for audio-to-control level;
Envelope is taken by the video ADSR.

Props:

| Prop                | Kind        | Notes                                                              |
| ------------------- | ----------- | ------------------------------------------------------------------ |
| `preset`            | enum        | built-in names plus `custom`, first in the node                    |
| `moduleId`          | audioModule | the audio module the host taps, as Band                            |
| `source`            | enum        | `level` or `band`                                                  |
| `lowHz`, `highHz`   | number      | band source only, control inputs as before                         |
| `minDb`, `maxDb`    | number      | the window that maps to 0..1; same ranges as the engine's Spectrum |
| `attack`, `release` | number      | seconds, exponential scale like the video Envelope                 |

Gain and smoothing go away. Output `out` in 0..1, one per instance.

Per tick:

1. Read a level in dB. Band source averages the bins in the Hz range from
   the host's tap, as Band does today. Level source reads one number the
   host adds to the spectrum message (below).
2. Map through `minDb..maxDb` to 0..1 and clamp.
3. Ballistics: a rising value follows the attack time, a falling one the
   release time, a one-pole per direction with coefficient
   `exp(-dt / time)`, per instance. Zero time means instant.

### Overall level from the host

The host's tap is a hidden Spectrum module, an `AnalyserModule`, which
already exposes the time-domain buffer. Per frame the host reads it, takes
the sample peak the way VuMeter does, converts to dB, and sends it in the
spectrum message beside the bins and sample rate:

```
{ type: "spectrum", moduleId, bins, sampleRate, levelDb }
```

One loop over the analyser buffer per tap per frame, one number, no second
transferred buffer. Peak rather than RMS because VuMeter uses peak and the
follower's own release does the smoothing. Swapping to RMS is one line if
peak proves too jumpy.

ADR 2 says the audio tab computes nothing and only makes native calls. The
peak loop is a small deviation. One sentence in ADR 2 records it in place;
it is not an architectural change.

### Presets

The Wavetable pattern, reused rather than a second mechanism:

- A table exported next to the module, like `WAVETABLE_PRESETS`, with a
  name and the prop values each sets.
- Choosing a preset writes `source`, `lowHz`, `highHz`, `minDb`, `maxDb`,
  `attack` and `release` in the same props update. `moduleId` is never part
  of a preset.
- Editing any of those props afterwards flips `preset` to `custom`.
- The saved props are the real values and `preset` is a label, so a patch
  loads the same if the table changes later.

Built-in presets are the whole feature for now. Custom values persist in
the patch, and copying a tuned node covers reuse within a session. A
per-user preset store is its own feature with storage and UI, deferred
until the built-ins show which knobs get retuned.

First table; the windows and times are starting points to tune by ear:

| Preset   | Source | Band            | dB         | Attack / release |
| -------- | ------ | --------------- | ---------- | ---------------- |
| Kick     | band   | 40 to 120 Hz    | -60 to -10 | 5 ms / 150 ms    |
| Bass     | band   | 40 to 250 Hz    | -60 to -10 | 10 ms / 300 ms   |
| Snare    | band   | 1 to 4 kHz      | -60 to -15 | 3 ms / 120 ms    |
| Hats     | band   | 6 to 16 kHz     | -70 to -20 | 2 ms / 80 ms     |
| Mids     | band   | 300 Hz to 3 kHz | -60 to -15 | 10 ms / 200 ms   |
| Loudness | level  | all             | -50 to 0   | 10 ms / 250 ms   |
| Swell    | level  | all             | -50 to 0   | 300 ms / 1 s     |

### Loading saved Band nodes

A saved `Band` loads as an AudioFollower with its `moduleId`, `lowHz` and
`highHz` kept, `source` set to band, and defaults for the rest. One alias
in the module registry. Band shipped on 2026-09-06, so patches from this
week hold some, and an unknown module type would fail the whole patch.

## SampleHold

New control module. Inputs `input` and `trigger`, both control; output
`out`. On each rising edge of `trigger` (crossing 0.5 upward) it copies
`input` to `out` and holds it until the next edge, per instance. Starts at
0 until the first trigger.

Trigger's pulse output is the natural clock. Kick preset into Trigger into
SampleHold, with an LFO on random or Noise into `input`, jumps a prop on
every kick and holds it between kicks.

No slew or smoothing on it. The audio engine has no sample and hold either,
so there is nothing to mirror; if a patch needs a glide a Smooth module is
the place, not a prop here.

## Trigger hysteresis

One new prop, `hysteresis`, 0 to 0.5, default 0. The gate opens above
`threshold` and closes below `threshold - hysteresis`. Pulse mode uses the
same pair for its rising edge. Default 0 keeps today's behavior exactly.

## Alternatives rejected

- A gate output on AudioFollower. Trigger already does it and would be
  duplicated; two nodes is the modular way and matches the audio side.
- Bipolar output on AudioFollower. The route's out range already expresses
  polarity, the same reason LFO is unipolar.
- Transferring the time-domain buffer to the worker for level. A second
  buffer in flight per tap for one number.
- A `smoothing` prop kept beside attack and release. Symmetric smoothing is
  the thing being replaced.
- User-saved presets. Storage and UI for a need the built-ins have not yet
  shown.
- No Band alias, as was done for bindings. Bindings had one day of patches;
  Band has a week, and a missing type fails the load.

## Testing

Video engine: level source maps `minDb..maxDb` to 0..1 and clamps; band
source selects bins by Hz as Band's test does; attack and release follow
their own times; choosing a preset writes its props and editing one flips
`preset` to custom; a saved Band loads as an AudioFollower keeping its
range; SampleHold holds between edges and updates on a rising edge per
instance; Trigger with hysteresis opens at threshold and closes at
threshold minus hysteresis, and with 0 behaves as before.

Grid: the spectrum message carries `levelDb`; the preset select renders
first and the Band alias shows in the palette as AudioFollower only.

## Order of work

One commit each, tested and reviewed before the next:

1. Rename Band to AudioFollower, `minDb`, `maxDb`, `attack` and `release`
   replacing gain and smoothing, band source only, and the Band alias.
2. Level source, with the host's `levelDb` on the spectrum message and the
   ADR 2 sentence.
3. Presets.
4. SampleHold.
5. Trigger hysteresis.
