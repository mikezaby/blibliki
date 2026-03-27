# Parent Instrument Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the current single-track `@blibliki/instrument` foundation into the broader parent Pi instrument architecture: top-level instrument documents, multi-track compilation, controller/runtime state, sequencer support, and display-facing state.

**Architecture:** Keep the authored `InstrumentDocument` as the source of truth and compile it into derived runtime artifacts. Reuse the existing block/track compiler wherever possible, add missing engine/runtime primitives only when the document/compiler work proves they are required, and keep Pi runtime/display state separate from the raw engine graph.

**Tech Stack:** TypeScript, Vitest, pnpm workspaces, `@blibliki/engine`, `@blibliki/instrument`, `@blibliki/pi`

### Task 1: Instrument Document Core

**Files:**
- Create: `packages/instrument/src/document/types.ts`
- Create: `packages/instrument/src/document/InstrumentDocument.ts`
- Create: `packages/instrument/src/document/defaultDocument.ts`
- Modify: `packages/instrument/src/index.ts`
- Test: `packages/instrument/test/document/InstrumentDocument.test.ts`

**Step 1: Write the failing test**

Add a test that expects a default instrument document to:
- declare `version`, `name`, `templateId`, `hardwareProfileId`
- contain a `globalBlock`
- contain exactly `8` tracks
- assign default `midiChannel` values `1..8`
- default each track to explicit note-source and page state

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/instrument test test/document/InstrumentDocument.test.ts`
Expected: FAIL because the document layer does not exist yet.

**Step 3: Write minimal implementation**

Add typed document structures and a `createDefaultInstrumentDocument()` helper that produces the fixed-template, fixed-track instrument document.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/instrument test test/document/InstrumentDocument.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/instrument/src/document packages/instrument/src/index.ts packages/instrument/test/document/InstrumentDocument.test.ts
git commit -m "feat: add instrument document core"
```

### Task 2: Hardware Profile and Template Metadata

**Files:**
- Create: `packages/instrument/src/profiles/hardwareProfile.ts`
- Create: `packages/instrument/src/templates/defaultTemplate.ts`
- Modify: `packages/instrument/src/document/defaultDocument.ts`
- Modify: `packages/instrument/src/index.ts`
- Test: `packages/instrument/test/document/defaultDocument.test.ts`

**Step 1: Write the failing test**

Add tests that expect the default document to resolve a known template id and known hardware profile id for the `LaunchControlXL3 + Pi LCD` target.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/instrument test test/document/defaultDocument.test.ts`
Expected: FAIL because the template/profile registry does not exist.

**Step 3: Write minimal implementation**

Add typed template and hardware-profile metadata registries that describe the fixed page contract and target ids without duplicating runtime mapping logic.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/instrument test test/document/defaultDocument.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/instrument/src/profiles packages/instrument/src/templates packages/instrument/src/document/defaultDocument.ts packages/instrument/src/index.ts packages/instrument/test/document/defaultDocument.test.ts
git commit -m "feat: add instrument template metadata"
```

### Task 3: Instrument Compiler Skeleton

**Files:**
- Create: `packages/instrument/src/compiler/compileInstrument.ts`
- Create: `packages/instrument/src/compiler/instrumentTypes.ts`
- Modify: `packages/instrument/src/compiler/createTrackEnginePatch.ts`
- Modify: `packages/instrument/src/index.ts`
- Test: `packages/instrument/test/compiler/compileInstrument.test.ts`

**Step 1: Write the failing test**

Add a test that expects a default instrument document to compile into:
- `8` compiled tracks with stable keys
- one aggregate runtime artifact shape
- multi-track display/controller metadata separated from audio graph data

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/instrument test test/compiler/compileInstrument.test.ts`
Expected: FAIL because there is no top-level instrument compiler.

**Step 3: Write minimal implementation**

Add a document-to-compiled-instrument skeleton that reuses the existing track compiler and returns a structured aggregate result, even before full controller navigation and external MIDI routing are complete.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/instrument test test/compiler/compileInstrument.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/instrument/src/compiler packages/instrument/src/index.ts packages/instrument/test/compiler/compileInstrument.test.ts
git commit -m "feat: add instrument compiler skeleton"
```

### Task 4: Engine MIDI Channel Routing Primitives

**Files:**
- Create: `packages/engine/src/modules/MidiChannelFilter.ts`
- Modify: `packages/engine/src/modules/index.ts`
- Test: `packages/engine/test/modules/MidiChannelFilter.test.ts`

**Step 1: Write the failing test**

Add tests that expect a MIDI channel filter module to pass events only for the configured channel and drop other channels.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/engine test test/modules/MidiChannelFilter.test.ts`
Expected: FAIL because the module does not exist.

**Step 3: Write minimal implementation**

Add a simple MIDI-only module with `channel` prop and `midi in` / `midi out` that forwards only matching events.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/engine test test/modules/MidiChannelFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/modules/MidiChannelFilter.ts packages/engine/src/modules/index.ts packages/engine/test/modules/MidiChannelFilter.test.ts
git commit -m "feat: add midi channel filter module"
```

### Task 5: Multi-Track Runtime Patch Builder

**Files:**
- Create: `packages/instrument/src/compiler/createInstrumentEnginePatch.ts`
- Modify: `packages/instrument/src/compiler/compileInstrument.ts`
- Modify: `packages/instrument/src/index.ts`
- Test: `packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts`

**Step 1: Write the failing test**

Add a test that expects the default instrument document to produce one engine patch with:
- shared master structure
- compiled track modules/routes merged deterministically
- one external MIDI input path per track via channel filters
- one controller runtime scaffold

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/instrument test test/compiler/createInstrumentEnginePatch.test.ts`
Expected: FAIL because there is no top-level runtime patch builder.

**Step 3: Write minimal implementation**

Create the aggregate runtime patch builder by composing compiled tracks, channel filters, and shared master/controller runtime modules.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/instrument test test/compiler/createInstrumentEnginePatch.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/instrument/src/compiler packages/instrument/src/index.ts packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts
git commit -m "feat: add multi-track instrument runtime patch builder"
```

### Task 6: Pi Runtime State Adapter

**Files:**
- Create: `packages/pi/src/instrumentRuntime.ts`
- Modify: `packages/pi/src/index.ts`
- Test: `packages/pi/test/instrumentRuntime.test.ts`

**Step 1: Write the failing test**

Add a test that expects Pi runtime helpers to expose:
- active track
- active page
- visible page slot metadata
- patch/document identity

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/pi test test/instrumentRuntime.test.ts`
Expected: FAIL because the adapter does not exist.

**Step 3: Write minimal implementation**

Add a typed runtime-state adapter on top of the compiled instrument/runtime patch structures.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/pi test test/instrumentRuntime.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/pi/src/instrumentRuntime.ts packages/pi/src/index.ts packages/pi/test/instrumentRuntime.test.ts
git commit -m "feat: add pi instrument runtime state adapter"
```

### Task 7: Sequencer Note-Source Integration

**Files:**
- Modify: `packages/instrument/src/document/types.ts`
- Modify: `packages/instrument/src/compiler/compileInstrument.ts`
- Modify: `packages/instrument/src/compiler/createInstrumentEnginePatch.ts`
- Test: `packages/instrument/test/compiler/compileInstrumentSequencer.test.ts`

**Step 1: Write the failing test**

Add a test that expects a track with `noteSource: "stepSequencer"` to compile with a local step sequencer path instead of external MIDI channel routing.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/instrument test test/compiler/compileInstrumentSequencer.test.ts`
Expected: FAIL because note-source switching is not implemented.

**Step 3: Write minimal implementation**

Add note-source branching in the compiler/runtime patch builder and keep the sequencer surface intentionally narrow.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/instrument test test/compiler/compileInstrumentSequencer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/instrument/src/document/types.ts packages/instrument/src/compiler packages/instrument/test/compiler/compileInstrumentSequencer.test.ts
git commit -m "feat: add instrument note-source compilation"
```

### Task 8: Display-Facing State Schema

**Files:**
- Create: `packages/instrument/src/runtime/displayState.ts`
- Modify: `packages/pi/src/instrumentRuntime.ts`
- Test: `packages/pi/test/displayState.test.ts`

**Step 1: Write the failing test**

Add a test that expects the display-facing state to expose:
- header state
- global band
- upper/lower track-page bands
- formatted slot metadata placeholders

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/pi test test/displayState.test.ts`
Expected: FAIL because no display-state schema exists.

**Step 3: Write minimal implementation**

Add a typed display-state schema and adapter layer without implementing the separate Rust renderer yet.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/pi test test/displayState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/instrument/src/runtime/displayState.ts packages/pi/src/instrumentRuntime.ts packages/pi/test/displayState.test.ts
git commit -m "feat: add display-facing instrument state"
```
