# Compressor Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a native Web Audio compressor with makeup gain, dry/wet mixing, a Grid gain-reduction meter, and selectable Instrument FX-slot support.

**Architecture:** `packages/engine` owns the audio graph and serialized parameter contract. `apps/grid` renders all controls and polls the engine's read-only reduction value. `packages/instrument` compiles Compressor into any FX slot and maps four controller controls without changing the default chain.

**Tech Stack:** TypeScript, Web Audio API, Vitest, React 19, Redux Toolkit, `@blibliki/ui`, pnpm workspaces.

### Task 1: Register the engine contract

**Files:**
- Create: `packages/engine/test/modules/Compressor.test.ts`
- Create: `packages/engine/src/modules/Compressor.ts`
- Modify: `packages/engine/src/modules/index.ts`
- Modify: `packages/engine/src/index.ts`

**Step 1: Write the failing registration and schema tests**

Add tests that import `Compressor`, `compressorPropSchema`, and
`ModuleType.Compressor`, then assert the approved ranges/default behavior and
that `createModule` constructs the module.

**Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm -C packages/engine test test/modules/Compressor.test.ts
```

Expected: FAIL because the module and enum member do not exist.

**Step 3: Add the minimal module type, mappings, schema, exports, and factory case**

Define `ICompressorProps` with `threshold`, `ratio`, `knee`, `attack`,
`release`, `makeup`, and `mix`. Register it in every exhaustive
`ModuleType` mapping and `createModule` switch.

**Step 4: Run the focused test and verify GREEN**

Run the same focused command. Expected: registration/schema tests PASS.

**Step 5: Commit**

```bash
git add packages/engine/src packages/engine/test/modules/Compressor.test.ts
git commit -m "feat(engine): register compressor module"
```

### Task 2: Implement compressor audio behavior

**Files:**
- Modify: `packages/engine/test/modules/Compressor.test.ts`
- Modify: `packages/engine/src/modules/Compressor.ts`

**Step 1: Write failing audio-graph tests**

Add focused tests for:

- native compressor parameters initialized from props;
- setter hooks update every parameter;
- makeup dB conversion updates the makeup `GainNode`;
- dry path uses a `DelayNode` set to `0.006`;
- mix zero passes the delayed dry signal;
- `getReduction()` returns the native reduction value.

**Step 2: Run the focused test and verify RED**

Expected: FAIL because the audio graph and methods are missing.

**Step 3: Implement the minimal audio graph**

Create an input `GainNode`, `DynamicsCompressorNode`, makeup `GainNode`, dry
`DelayNode`, and `WetDryMixer`. Register input from the input gain and output
from the mixer. Apply all initial properties synchronously and implement setter
hooks plus `getReduction()`.

**Step 4: Run focused and engine tests**

```bash
pnpm -C packages/engine test test/modules/Compressor.test.ts
pnpm -C packages/engine test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/engine/src/modules/Compressor.ts packages/engine/test/modules/Compressor.test.ts
git commit -m "feat(engine): implement compressor audio graph"
```

### Task 3: Add Instrument compressor profile

**Files:**
- Create: `packages/instrument/test/blocks/CompressorBlock.test.ts`
- Create: `packages/instrument/src/blocks/effects/CompressorBlock.ts`
- Modify: `packages/instrument/test/compiler/compileTrack.test.ts`
- Modify: `packages/instrument/src/document/types.ts`
- Modify: `packages/instrument/src/tracks/TrackEffectProfile.ts`
- Modify: `packages/instrument/src/index.ts`

**Step 1: Write failing block and compilation tests**

Assert that `CompressorBlock` contains one `ModuleType.Compressor` module with
approved defaults and `mix: 0`, exposes `in`/`out`, and that a track configured
with Compressor maps `threshold`, `ratio`, `makeup`, and `mix` into one FX
region.

**Step 2: Run focused tests and verify RED**

```bash
pnpm -C packages/instrument test test/blocks/CompressorBlock.test.ts test/compiler/compileTrack.test.ts
```

Expected: FAIL because the profile is unknown.

**Step 3: Implement the profile**

Add `"compressor"` to the document type, implement the block, add exhaustive
profile switch cases, export the block, and leave `DEFAULT_FX_CHAIN` unchanged.

**Step 4: Rebuild engine and run focused Instrument tests**

```bash
pnpm build:packages
pnpm -C packages/instrument test test/blocks/CompressorBlock.test.ts test/compiler/compileTrack.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/instrument
git commit -m "feat(instrument): add compressor effect profile"
```

### Task 4: Add Grid controls and meter

**Files:**
- Create: `apps/grid/src/components/AudioModule/Compressor.tsx`
- Create: `apps/grid/test/AudioModule/Compressor.test.tsx`
- Modify: `apps/grid/test/AudioModule/availableModules.test.ts`
- Modify: `apps/grid/src/components/AudioModule/index.tsx`
- Modify: `apps/grid/src/components/AudioModule/modulesSlice.ts`
- Modify: `apps/grid/src/components/Instruments/InstrumentEditor.tsx`
- Modify: `apps/grid/src/instruments/document.ts`

**Step 1: Write failing registry/component tests**

Assert Compressor is available in the Grid registry with default engine props,
the component renders all seven labeled controls, and a mocked live engine
module reduction value is rendered by the meter.

**Step 2: Run focused Grid tests and verify RED**

```bash
pnpm -C apps/grid test test/AudioModule/availableModules.test.ts test/AudioModule/Compressor.test.tsx
```

Expected: FAIL because the component and registrations do not exist.

**Step 3: Implement Grid and editor support**

Build the component from existing `Fader`, `Stack`, `Surface`, and `Text`
primitives. Poll `Engine.current.findModule(id)` using the shared
`requestAnimationFrame`, stop on cleanup, and render reduction without Redux.
Register the module and add `"compressor"` to the Grid Instrument effect union
and options.

**Step 4: Run focused Grid tests**

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/grid
git commit -m "feat(grid): add compressor controls and meter"
```

### Task 5: Verify end to end

**Files:**
- Modify only if verification reveals compressor-specific defects.

**Step 1: Format**

```bash
pnpm format
```

**Step 2: Build packages**

```bash
pnpm build:packages
```

**Step 3: Run required repository checks**

```bash
pnpm tsc
pnpm lint
pnpm test
```

Expected: all commands succeed.

**Step 4: Run Grid and inspect in browser**

Start Grid, add a Compressor node, verify all controls update, verify the meter
moves under compression, and verify an Instrument track can select Compressor
in any FX slot.

**Step 5: Commit verification fixes, if any**

```bash
git add <compressor-related-files>
git commit -m "fix: complete compressor integration"
```
