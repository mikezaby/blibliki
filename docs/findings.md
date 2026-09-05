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
