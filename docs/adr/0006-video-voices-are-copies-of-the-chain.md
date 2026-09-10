# 6. Video voices are copies of the chain, composed by a Layout module

Date: 2026-09-10. Status: accepted.

## Context

A patch wants one Source to show many colours at once, the way one audio
PolyModule plays six notes, and a coming playback module to show a video
at many seek positions, as glijs does with its multi-seek slices. Each
voice should have its own filter and envelope, and take its values from
outside (a MIDI note per voice, later), not from a rule inside the module.
Placing 81 modules by hand and a merge with 81 inputs is not patchable.

## Decision

Voices duplicate the chain and nothing else. A texture module opts in by
spreading the shared `voices` prop into its props and schema. The pass
builder renders that module once per voice, and every module after it
once per voice as well, each voice reading the matching voice of its
inputs. A mono input to a poly module feeds every voice; a narrower poly
input wraps around. Voices are identical until something outside the
module gives them different values, as audio voices are identical until
notes arrive.

Display is a separate decision. A Layout module takes a poly texture and
tiles the voices into one, grid or strips, each voice showing its own
region of its frame as glijs's cubes and strips do. Output composes as a
grid on its own, so a patch without Layout still shows every voice.

The renderer recycles targets: a texture goes back to a pool after its
last reader in the frame, so memory is about the widest voice count plus
one canvas-sized texture, not one per module and voice.

`voices` is an ordinary prop, so the grid edits it like any other, patches
save it without a new shape, and a control route can drive it.

## Alternatives rejected

- Deriving per-voice values inside the module from the voice number (hue
  plus a spread, a seek offset per index). Two attempts went this way.
  It makes the module decide what its voices show, which the audio engine
  never does; there the values come from the voice allocator.
- Composing at the poly module's output. Then a filter after it runs once
  on the whole grid, not once per voice.
- A Poly class per module, as the audio engine does. Audio voices own live
  Web Audio connections that must be re-plugged; a video voice is a pass,
  so one method on the base class is enough.
- A Matrix module with a texture input per cell, or instancing a sub-graph
  N times with a sub-patch editor. Unusable at 81 inputs; the second is
  deferred until a cell must run a different chain from its neighbours.

## Consequences

Voices are not individually routable; a route carries all of them.
Rendering cost is voices times passes at full resolution: fine for 9 to
18 voices with short chains, heavy at 81, where rendering voices at cell
resolution would be the next lever.

Per-voice values are the next increment: control modules gain voices, a
control route feeds voice v with value v, and a MIDI voice allocator and
an envelope give each voice its own values. Until then voices are copies.
