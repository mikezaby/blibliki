# 7. Per-voice values reach video voices as control voices

Date: 2026-09-10. Status: accepted. Extends ADR 6.

## Context

ADR 6 made video voices copies of the chain, identical until something
outside the module gives each its own values. The audio engine does that
with per-voice signals: a note reaches one voice, whose envelope and filter
then differ from its neighbours'. The video engine's control kind carried
one number per frame per output, with no notion of voices.

## Decision

Control modules have voices too. A control module opts in by spreading the
shared `voices` prop, and a module of either kind follows the widest of
its inputs across both route kinds, so a mono Source whose hue is driven
by a four-voice Envelope renders four voices. The engine ticks a control
module once per voice, with that voice's resolved props, and stores each
voice's outputs under `<module>:<output>:<voice>`; a mono module keeps the
old `<module>:<output>` name. A control route feeds voice v of its
consumer from voice v of a poly source, wrapping around a narrower one,
and from the one value of a mono source.

Modules that keep state between frames keep it per voice: the LFO's
phase, Band's smoothing, and the new Envelope's stage and level. Envelope
is the first per-voice shaper: an ADSR driven by a `gate` prop, which a
control route opens and closes per voice.

A module's own `voices` prop is resolved with mono routes only, so a poly
control cannot drive the voice count.

## Alternatives rejected

- Arrays as control values. Every consumer, the host mirror and the
  saved patch would learn a second value shape; names keep the map flat
  and the host's mono pushes untouched.
- Summing a poly control into a mono consumer, as a Web Audio mono input
  sums poly outputs. Summing hue offsets or seek positions has no useful
  meaning; following the source's voices does.

## Consequences

Until a per-voice source exists, voices driven by the same gate still
move together. The next increment brings MIDI into the worker with a
voice allocator that emits gate, note and velocity per voice, at which
point each voice takes its own note.
