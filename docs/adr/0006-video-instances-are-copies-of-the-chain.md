# 6. Video instances are copies of the chain, composed by a Layout module

Date: 2026-09-10. Status: accepted.

## Context

A patch wants one Source to show many colours at once, the way one audio
PolyModule plays six notes, and a coming playback module to show a video
at many seek positions, as glijs does with its multi-seek slices. Each
copy should have its own filter and envelope, and take its values from
outside (a MIDI note per copy, later), not from a rule inside the module.
Placing 81 modules by hand and a merge with 81 inputs is not patchable.

The video engine calls such a copy an instance, the term of GPU
instancing, TouchDesigner, Blender and Jitter. It is what the audio
engine calls a voice.

## Decision

Instances duplicate the chain and nothing else. A texture module opts in
by spreading the shared `instances` prop into its props and schema. The
pass builder renders that module once per instance, and every module
after it once per instance as well, each instance reading the matching
instance of its inputs. A mono input to an instanced module feeds every
instance; a narrower instanced input wraps around. Instances are
identical until something outside the module gives them different
values, as audio voices are identical until notes arrive.

Display is a separate decision. A Layout module takes an instanced
texture and tiles the instances into one, grid or strips, each instance
showing its own region of its frame as glijs's cubes and strips do.
Output composes as a grid on its own, so a patch without Layout still
shows every instance.

The renderer recycles targets: a texture goes back to a pool after its
last reader in the frame, so memory is about the widest instance count
plus one canvas-sized texture, not one per module and instance.

`instances` is an ordinary prop, so the grid edits it like any other,
patches save it without a new shape, and a control route can drive it.

## Alternatives rejected

- Deriving per-instance values inside the module from the instance
  number (hue plus a spread, a seek offset per index). Two attempts went
  this way. It makes the module decide what its instances show, which
  the audio engine never does; there the values come from the voice
  allocator.
- Composing at the instanced module's output. Then a filter after it
  runs once on the whole grid, not once per instance.
- A Poly class per module, as the audio engine does. Audio voices own
  live Web Audio connections that must be re-plugged; a video instance is
  a pass, so one method on the base class is enough.
- Calling them voices, as the audio engine does. An instance of a
  picture is not a voice; the audio term would read as a metaphor in the
  grid.
- A Matrix module with a texture input per cell, or instancing a
  sub-graph N times with a sub-patch editor. Unusable at 81 inputs; the
  second is deferred until a cell must run a different chain from its
  neighbours.

## Consequences

Instances are not individually routable; a route carries all of them.
Rendering cost is instances times passes at full resolution: fine for 9
to 18 instances with short chains, heavy at 81, where rendering
instances at cell resolution would be the next lever.

Per-instance values arrive as instanced controls; ADR 7 records how.
