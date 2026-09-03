# 2. Audio reaches the video engine as analyser data, not as an audio stream

Date: 2026-09-03. Status: accepted. Context: GitHub #62,
`docs/plans/2026-09-03-video-engine-design.md`.

## Context

Visuals should react both to the audio patch (knob positions) and to the
audio itself (spectrum, level). The video engine runs in a worker (ADR 1)
with no access to the audio graph.

## Decision

Two feeds, both over `postMessage` to the worker:

- The audio patch is mirrored, not re-run. The engine already exposes
  `serialize()`, `onPropsUpdate` and `onStateUpdate`, and
  `@blibliki/display-protocol` already uses this shape to feed the Pi
  display. The host sends a snapshot on connect and forwards each update as
  named controls (`patch:<moduleId>:<prop>`). The worker keeps a read-only
  mirror; there is no fake audio engine.
- The audio tab reads an `AnalyserNode`'s frequency bins once per frame (a
  native call, no JS DSP) and transfers the buffer to the worker, which
  reduces it to a few band controls. One buffer is in flight at a time and
  comes back after each read, so steady state allocates nothing.

## Alternatives rejected

- An OS loopback device (BlackHole) feeding `getUserMedia` in a second tab.
  macOS only, a system install, a permission prompt per session, extra
  latency, and echo cancellation, noise suppression and auto gain must be
  disabled or the spectrum is mangled. Does nothing for the Capacitor
  mobile target. A loopback input may still be added later as a video
  source module for reacting to audio that is not blibliki's.
- Re-running the audio patch in the worker as a fake engine. Duplicates
  the engine for no gain; the mirror is a map.

## Consequences

Prop updates fire for knob and UI changes only. Audio-rate modulation (an
LFO sweeping a cutoff) never touches props, so the mirror sees the knob
position. Reacting to a modulated signal needs a "video send" module on the
audio side that samples a signal and streams it. Out of scope for the
bootstrap.
