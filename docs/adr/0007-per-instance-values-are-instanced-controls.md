# 7. Per-instance values reach video instances as instanced controls

Date: 2026-09-10. Status: accepted. Extends ADR 6; ADR 9 supersedes the
rule that a module follows its inputs' instance count.

## Context

ADR 6 made video instances copies of the chain, identical until something
outside the module gives each its own values. The audio engine does that
with per-voice signals: a note reaches one voice, whose envelope and
filter then differ from its neighbours'. The video engine's control kind
carried one number per frame per output, with no notion of instances.

## Decision

Control modules have instances too. A control module opts in by
spreading the shared `instances` prop, and a module of either kind
follows the widest of its inputs across both route kinds, so a single
Source whose hue is driven by a four-instance Envelope renders four
instances. The engine ticks a control module once per instance, with
that instance's resolved props, and stores each instance's outputs under
`<module>:<output>:<instance>`; a single module keeps the old
`<module>:<output>` name. A control route feeds instance v of its
consumer from instance v of an instanced source, wrapping around a
narrower one, and from the one value of a single source.

Modules that keep state between frames keep it per instance: the LFO's
phase, Band's smoothing, and the new Envelope's stage and level.
Envelope is the first per-instance shaper: an ADSR driven by a `gate`
prop, which a control route opens and closes per instance.

A module's own `instances` prop is resolved from single sources only, so an
instanced control cannot drive the instance count.

## Alternatives rejected

- Arrays as control values. Every consumer, the host mirror and the
  saved patch would learn a second value shape; names keep the map flat
  and the host's pushes untouched.
- Summing an instanced control into a single consumer, as a Web Audio mono
  input sums poly outputs. Summing hue offsets or seek positions has no
  useful meaning; following the source's instances does.

## Consequences

Instances driven by the same gate still move together; MIDI Notes
(ADR 8) gives each instance its own note.
