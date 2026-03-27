# Instrument Grid And Deployment Follow-Up Design

## Purpose

The instrument runtime foundation now exists in `@blibliki/instrument` and `@blibliki/pi`, but three product-facing gaps remain:

- there is no real terminal mock screen for fast display testing
- there is no Grid UI for listing or editing instruments
- device assignment is still patch-only, which would incorrectly force instruments to replace plain patch deployment

This document locks the missing decisions so the next implementation phase can proceed without ambiguity.

## Current State

### Terminal display

The runtime already exposes structured display state through:

- `packages/instrument/src/runtime/displayState.ts`
- `packages/pi/src/instrumentRuntime.ts`
- `packages/pi/src/liveDisplayState.ts`

There is also a minimal terminal log hook in `packages/pi/src/defaultInstrument.ts`:

- `logDisplayState(displayState)` prints one compact line with track, page, and band titles

That is useful for smoke tests, but it is not a real mock LCD. It does not render:

- the header layout
- the global band values
- the upper/lower slot grids
- inactive-slot placeholders
- live value formatting in a way that resembles the eventual LCD

### Grid authoring UI

There is currently no instrument list/editor surface in Grid.

Existing UI state:

- routes exist for `/devices` and `/patch/$patchId`
- there is no `/instruments` route
- there is no `/instrument/$instrumentId` route
- device editing currently lives in `apps/grid/src/components/Devices/DeviceModal.tsx`

### Device deployment

Device persistence is still patch-only:

- `packages/models/src/Device.ts` stores only `patchId`
- `packages/pi/src/index.ts` loads only a `Patch`
- `apps/grid/src/components/Devices/DeviceModal.tsx` lets the user assign only a patch

That is incompatible with the desired instrument direction because it would force instruments to replace plain patches. We explicitly do **not** want that.

## Decisions

### 1. Add a dev-only terminal mock screen

We should add a terminal renderer for `InstrumentDisplayState` in `packages/pi`.

This is a developer tool, not the final LCD runtime.

It should:

- render the same `header + global + upper + lower` structure as the LCD model
- show all slot labels and formatted values
- preserve inactive slots visibly
- redraw in place in the terminal using a simple ANSI/ASCII renderer
- consume `InstrumentDisplayState`, not inspect engine modules directly

This renderer should be usable from the built-in instrument launcher so display iteration can happen without waiting for the Rust LCD process.

Recommended first API:

- `renderInstrumentDisplayStateToTerminal(displayState)`
- optional `createTerminalDisplaySession(...)` helper for redraw lifecycle

### 2. Add dedicated Grid instrument surfaces

Instrument authoring should live beside patches, not inside the patch editor and not inside devices.

The first Grid surfaces should be:

- `/instruments`
- `/instrument/$instrumentId`

Responsibilities:

- `/instruments`
  - list existing instruments
  - create a new instrument document
  - open an instrument for editing
- `/instrument/$instrumentId`
  - edit instrument document metadata
  - edit track-level source profile, FX chain, note source, MIDI channel
  - edit sequencer content for sequencer-backed tracks

The first instrument editor should stay document-oriented and constrained. It should **not** try to be a second freeform graph editor.

Instrument persistence should use a separate collection/model from patches.

Recommended model direction:

- `Instrument` Firestore model in `packages/models`
- Grid slice/hooks mirroring the existing patch list/load patterns

### 2.5 Add a transient Grid debug view for compiled instruments

Instrument authoring should stay document-oriented, but we still need a fast way to inspect the compiled runtime graph when debugging routing or generated module structure.

This should not create a second persisted patch model. It should be a transient debug bridge:

- load an instrument document
- compile it to the real runtime engine patch
- convert runtime modules and routes into Grid nodes and edges
- auto-layout nodes because instrument documents do not store Grid `x/y` positions
- load that transient graph into the existing Grid editor

The user-facing entrypoint should live on the instrument editor as a `Debug in Grid` action.

Important constraints:

- the debug view should reuse the existing patch/Grid editor
- it should not save back into the instrument document
- it should not require persisted patch conversion
- auto-layout should be deterministic so repeated opens are easy to compare

Recommended first behavior:

- path: `/instrument/$instrumentId/debug`
- source of truth: compiled runtime patch, not the authored document directly
- layout strategy: generated column/row positions from module groups and route depth

### 3. Keep device deployment dual-mode: patch or instrument

Devices must support both:

- plain patch deployment
- instrument deployment

The correct device model is a tagged deployment target, not a single `patchId`.

Recommended shape:

```ts
type DeviceDeploymentTarget =
  | { kind: "patch"; patchId: string }
  | { kind: "instrument"; instrumentId: string }
  | null;
```

Practical persistence options:

- preferred: add `deploymentTarget`
- compatibility path: keep reading legacy `patchId` and normalize it to `{ kind: "patch", patchId }`

Grid device UI should offer:

- target type selector: `None`, `Patch`, `Instrument`
- one picker that changes according to the selected target type

Pi startup should branch by target kind:

- `patch` -> existing raw patch load path
- `instrument` -> load instrument document, compile runtime patch, then start instrument session

This preserves plain-patch workflows while enabling instruments as a first-class deployment target.

## Implementation Order

Recommended order:

1. Add the terminal mock screen in `packages/pi`
2. Add deployment-target support to `packages/models`, Grid devices UI, and Pi startup
3. Add the Grid instrument list surface
4. Add the first constrained instrument editor
5. Add the transient compiled-instrument Grid debug view

This order keeps plain patch support safe while making instrument work visible early.

## Testing Expectations

### Terminal mock screen

- snapshot-like tests over rendered terminal output
- verify inactive slots and seq-edit views render correctly

### Grid instrument UI

- route tests for `/instruments` and `/instrument/$instrumentId`
- form/store tests for document edits

### Device deployment

- model serialization tests for patch and instrument targets
- device modal tests for switching target type
- Pi startup tests proving patch and instrument paths both work
