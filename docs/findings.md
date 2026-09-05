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

## Bound video props do not show the live value

`apps/grid/src/components/VideoModule/BindingControl.tsx` shows the stored
prop value and the control label; the projector follows the control but the
slider does not. Add a per-frame `values` message from the worker carrying
effective props, and render bound fields from it.

## Binding dialog keeps stale state when a binding is removed elsewhere

`BindingControl.tsx` seeds its dialog state from the binding once on mount.
Deleting the Spectrum module a prop is bound to clears the label but leaves
the dialog's chosen control until the node remounts, and Save leaves the
dialog open. Key the dialog body on the binding's control and close on Save.
