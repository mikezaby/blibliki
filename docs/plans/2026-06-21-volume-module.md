# Volume Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dB-based `Volume` engine module whose serialized `volume` property ranges from `-60` to `6`, with `-60` producing true silence.

**Architecture:** Keep `Gain` as the linear Web Audio/VCA abstraction. Add `Volume` as a separate polyphonic module backed by `GainNode`, converting dB to linear gain and treating the minimum as a mute sentinel. Register it in the engine and Grid, then use it for instrument track and master level controls while preserving `Gain` for envelope modulation.

**Tech Stack:** TypeScript, Web Audio API, Vitest, React, Redux Toolkit, pnpm workspaces.

### Task 1: Engine behavior

**Files:**
- Create: `packages/engine/test/modules/Volume.test.ts`
- Create: `packages/engine/src/modules/Volume.ts`
- Modify: `packages/engine/src/modules/index.ts`
- Modify: `packages/engine/src/index.ts`

1. Write tests for unity at `0 dB`, conversion at negative and positive dB values, true silence at `-60 dB`, runtime prop updates, and serialization as `{ volume }`.
2. Run the focused test and verify it fails because `Volume` is not implemented.
3. Add the minimal module implementation and registration.
4. Run the focused engine test and existing Gain tests.

### Task 2: Grid integration

**Files:**
- Create: `apps/grid/src/components/AudioModule/Volume/index.tsx`
- Modify: `apps/grid/src/components/AudioModule/index.tsx`
- Modify: `apps/grid/src/components/AudioModule/modulesSlice.ts`

1. Add a `-60..6 dB` fader bound directly to the serialized `volume` property.
2. Register the component and module catalog entry.
3. Type-check the Grid integration after rebuilding packages.

### Task 3: Instrument integration

**Files:**
- Modify: `packages/instrument/src/blocks/TrackGainBlock.ts`
- Modify: `packages/instrument/src/compiler/instrumentRuntimeModules.ts`
- Modify: `packages/instrument/src/compiler/createInstrumentMidiMapperProps.ts`
- Modify: `packages/instrument/src/display/InstrumentDisplayState.ts`
- Modify: `packages/instrument/src/display/LiveInstrumentDisplayState.ts`
- Modify: `packages/instrument/src/document/defaultDocument.ts`
- Modify: `packages/instrument/src/document/SavedInstrumentDocument.ts`
- Modify relevant existing tests under `packages/instrument/test/`

1. Update existing tests to expect `Volume` and dB values for track/master level modules.
2. Run focused instrument tests and verify the expected failures.
3. Switch track/master level modules and mappings to `ModuleType.Volume` and property `volume`.
4. Display master volume in dB and persist the runtime dB value.
5. Run focused instrument tests.

### Task 4: Verification

1. Run `pnpm build:packages`.
2. Run `pnpm tsc`.
3. Run `pnpm lint`.
4. Run `pnpm test`.
5. Run `pnpm format`.
6. Re-run checks affected by formatting and inspect the final diff.
