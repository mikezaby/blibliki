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

## Media files are not persisted with a patch

`apps/grid/src/components/VideoModule/MediaBody.tsx` keeps the picked file
in the host for the session and saves only its name, so a reloaded patch
shows the name and a black picture until the file is picked again. Store
picked files in IndexedDB keyed by module id, as glijs does, and restore
them when the video host starts.

## Video nodes show controls that rarely matter

Every instanced module shows Instances, and Source shows Spread in solid
mode where it does nothing. Hide Spread unless the mode is gradient, and
consider a compact header control for Instances like the audio nodes'
Voices, in `apps/grid/src/components/Grid/VideoNode.tsx`.

## CLAUDE.md lists apps that no longer exist

The repository structure section of `CLAUDE.md` lists `apps/demo` and
`apps/bubbleton`, which are gone, and omits `apps/mobile`, `apps/pi-display`
and `apps/storybook`. Replace the list with the current `apps/` directory.

## Grid keeps its own copy of the instrument document types

`apps/grid/src/instruments/document.ts` redeclares `InstrumentDocument`,
`InstrumentTrackDocument`, `SourceProfileId`, `EffectProfileId` and the
sequencer types, and has its own `createDefaultInstrumentDocument()`, while
already importing `createDefaultGlobalController` from
`@blibliki/instrument`. The two copies match today. Delete the grid copy and
import the types and the factory from the package.

## Grid lets a track be fed from itself or from the master

`audioSourceOptions` in
`apps/grid/src/components/Instruments/InstrumentEditor.tsx` lists every
track, including the one being edited and the master track. Filter both out,
as `apps/instruments/src/InstrumentStructureEditor.tsx` does.

## The console's meter polls a module that is already gone

Opening an instrument in `apps/instruments` under `pnpm dev` throws
"The module with id ... is not exists" twice while the console loads. The
throw is `engine.findModule(meterId)` in the meter's `render` loop in
`packages/instrument/src/react/InstrumentPerformance.tsx`, for the VuMeter
the effect added itself, so the module was removed without that effect's
cleanup stopping the loop first. Not traced further. Guard the lookup, or
stop the loop when the engine is rebuilt. `useInstrumentSession` (increment 3
of the performance split) is the natural place.

## CLAUDE.md says only the engine has tests

`CLAUDE.md` says "only engine has tests currently" in the commands list and
again under Testing. Twelve workspaces have a test script now. Replace both
sentences with the current split: `pnpm test:rest` and `pnpm test:engine`.

## node-web-audio-api deadlocks when a context closes during worklet startup

`AudioContext.close()` in `node-web-audio-api` 2.2.0 never resolves about 1
time in 20 when it is called within 10 ms of creating an `AudioWorkletNode`
whose processor is slow to construct (Wavetable). The render thread stops
and no thread uses CPU. `packages/engine/test/testSetup.ts` gives up on the
close after 1 s. Browsers are not affected; `packages/pi` could hit it only
by shutting down while a patch loads. Report it upstream with a loop that
creates a context, adds a worklet node and closes at once, then drop the
timeout when a fixed version is in the catalog.

## The XL3 DAW v1 doc describes the track buttons wrongly

`docs/launch-control-xl3-daw-v1.md` says the Track buttons are page
aliases. In `packages/instrument/src/surfaces/launchControlXL3/LaunchControlXL3Surface.ts`
they change the active track, and with Shift they save or discard the
draft. Rewrite that table from the surface's CC constants, or delete the
doc in favour of the surface as the source of truth.
