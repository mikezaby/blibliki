# Findings

Problems noticed but not fixed in the session that found them. Each entry:
what is wrong, where, how to fix it.

## Prop schema types are duplicated between engine and video-engine

`packages/video-engine/src/core/schema.ts` is a copy of
`packages/engine/src/core/schema.ts` so the video worker bundle does not
import Web Audio code. If both stay identical, move the types to
`@blibliki/utils` and import them from both packages.

## Engine has no way to remove an onPropsUpdate callback

`Engine.onPropsUpdate` pushes to an array with no remover, unlike
`onStateUpdate`. `VideoEngineHost` works around it with a disposed flag.
Add `removePropsUpdateCallback` to `packages/engine/src/Engine.ts`.

## Wavetable engine tests are flaky under real-time AudioContext

`packages/engine/test/modules/Wavetable.test.ts` times out on different
tests from run to run ("stays stable with mismatched table harmonic
lengths", "updates output on position changes without starting
transport"), on `main` as well as on feature branches. Each test waits
on a real-time context; the 10 s hook timeout is hit under load. Make
those tests use an offline context or raise their timeout.

## Palette drag buttons have no keyboard path

The audio and video module buttons in
`apps/grid/src/components/Grid/AudioModules.tsx` add a module only through
HTML drag and drop, so keyboard users cannot add one. Give each button an
`onClick` (or Enter handler) that dispatches the same add thunk at a default
canvas position.

## Engine.current keeps returning a disposed engine

`Engine.dispose` in `packages/engine/src/Engine.ts` never clears
`_currentId`, so `Engine.current` resolves to the disposed instance until the
next `load`. Harmless today, a trap for anything that mounts before `load`.
Clear `_currentId` in `dispose` when it matches `this.id`.

## Copy and paste skips video nodes

`apps/grid/src/components/Grid/clipboard.ts` builds its snapshot from audio
modules only, so selected video nodes are silently left out of a copy. Extend
the snapshot with video modules, routes and bindings, and paste them through
`videoPatchSlice`.

## Bound video prop fields show the stored value, not the driven one

`apps/grid/src/components/VideoModule/VideoField.tsx` renders the stored
prop; the projector follows the control route but the slider does not. Add
a per-frame `values` message from the worker carrying effective props, and
render driven fields from it.

## Control range dialog seeds its draft once and stays open on Save

`apps/grid/src/components/Grid/ControlEdge.tsx` copies the route's range
into local state on mount. A range changed elsewhere (a reloaded patch, a
future second editor) is not reflected until the edge remounts, and Save
leaves the dialog open. Key the dialog body on the route's range and close
on Save.

## Handle indicator dot sits over the handle and starts a node drag

`apps/grid/src/components/Grid/AudioNode.tsx` draws a small indicator div
over each handle's center. It is not `nodrag`, so a press exactly on it
grabs the node instead of starting a cable; on audio and video nodes alike,
at small zoom levels the dot covers most of the handle. Add
`pointer-events-none` to the indicator.

## Engine tests time out under the full parallel test run

`packages/engine/test/modules/Wavetable.test.ts` (the file took about 11 s)
and `packages/engine/test/modules/LFO.test.ts` ("updates the phase parameter
when props change", "initializes the phase parameter immediately from
props") and `packages/engine/test/core/Module.test.ts` ("should still
have correct param value immediately when relying on hooks") each failed
once during a `pnpm test` run, then passed alone and on the next run. They are timing-sensitive under
load. Find the waits on real time and either raise their timeouts or drive
them from a fake clock.
