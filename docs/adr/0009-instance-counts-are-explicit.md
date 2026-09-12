# 9. Every module has its own instance count, as every audio module has its own voices

Date: 2026-09-10. Status: accepted. Supersedes the input-following rule of
ADRs 6 and 7.

## Context

ADRs 6 and 7 let a module without an `instances` setting follow the
widest of its inputs, so a Source set to one instance rendered nine as
soon as a nine-instance MIDI Notes drove its hue. In use that read as the
cable overriding the knob, and it differs from the audio engine, where a
module plays exactly the voices its own setting says and connections
never change that.

## Decision

A module runs as many instances as its own `instances` prop says, and
nothing else. Texture processors (HueRotate, Merge) and control shapers
(LFO, Envelope, MIDI Notes) carry the prop like Source does, and the grid
shows it on every such node as it shows Voices on audio nodes. Layout,
Output, Band and Audio Prop are single.

Connections follow the audio engine's rules for mismatched counts:

- Instance i of a module reads instance i of an instanced input, wrapping
  around a narrower one, as PolyAudioIO wraps voice indices. Audio also
  sums the extra voices of a wider source into the consumer; a texture
  cannot be summed, so a wider source's extra instances are dropped.
- A single input feeds every instance.
- An instanced texture into a single input is composed into a grid once
  per source, and every single consumer reads that mix. This is the
  texture analog of a mono audio input summing poly voices: a single
  HueRotate after a nine-instance Source works on the whole grid. Layout
  composes with its own layout instead.
- An instanced control into a single consumer gives it instance 0. Summing
  a hue or a note has no meaning, so the first instance stands in.

## Alternatives rejected

- Following the widest input (ADRs 6 and 7). Convenient for one cable,
  confusing with two, and unlike audio.
- Following the widest input only when the module's own count is left at
  its default. It keeps the surprise for the default case, which is the
  common one.

## Consequences

To see nine notes, set nine instances on the Source, on any effect that
should treat them apart, and on the Envelope, as a nine-voice patch needs
nine voices on each audio module. A control route into `instances` is
resolved at instance 0.
