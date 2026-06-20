# Shared Step Sequencer Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reuse one controlled step-sequencer editing UI in both the grid audio module and instrument configuration without coupling instrument documents to a live engine module.

**Architecture:** Extract the page/settings/step editing portion of the existing audio-module component into a controlled `StepSequencerEditor`. Keep pattern sequencing, engine runtime lookup, and start/stop lifecycle in the audio-module wrapper. Add a small instrument adapter that converts document steps to engine editor steps by supplying empty CC messages and strips CC messages when writing back.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, `@blibliki/engine`, `@blibliki/ui`.

### Task 1: Define and test instrument sequencer adapter behavior

**Files:**
- Create: `apps/grid/src/components/AudioModule/StepSequencer/instrumentAdapter.ts`
- Create: `apps/grid/test/AudioModule/StepSequencer/instrumentAdapter.test.ts`

**Step 1: Write failing adapter tests**

Test that:

- Instrument pages gain `ccMessages: []` when converted for the shared editor.
- Editor step changes update the selected instrument page and step immutably.
- Editor-only CC messages are not persisted into the instrument document.

**Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm -C apps/grid test test/AudioModule/StepSequencer/instrumentAdapter.test.ts
```

Expected: FAIL because `instrumentAdapter.ts` does not exist.

**Step 3: Implement the minimal adapter**

Export conversion and immutable update helpers using the existing instrument document types and engine `IPage`/`IStep` types.

**Step 4: Run the focused test and verify GREEN**

Run the same focused test and expect all adapter tests to pass.

### Task 2: Extract the controlled shared editor

**Files:**
- Create: `apps/grid/src/components/AudioModule/StepSequencer/StepSequencerEditor.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/Controls.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/PageNavigator.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/StepEditor.tsx`
- Create: `apps/grid/test/AudioModule/StepSequencer/StepSequencerEditor.test.tsx`

**Step 1: Write failing component tests**

Render the controlled editor and verify:

- Clicking a step selects the same shared `StepEditor` used by the module UI.
- Toggling a step emits an immutable updated step.
- CC editing can be hidden for instrument mode.
- Runtime start/stop controls are absent when handlers are not supplied.

**Step 2: Run the focused component test and verify RED**

Run:

```bash
pnpm -C apps/grid test test/AudioModule/StepSequencer/StepSequencerEditor.test.tsx
```

Expected: FAIL because `StepSequencerEditor.tsx` does not exist.

**Step 3: Implement the controlled editor**

Move selected-step state, last-configured-step behavior, page navigation, controls, step grid, and step editor composition into the new component. Make transport controls, page mutation actions, steps-per-page control, and CC editing capability-driven optional props.

**Step 4: Run focused tests and verify GREEN**

Run the adapter and component tests together and expect them to pass.

### Task 3: Convert the audio-module implementation into a wrapper

**Files:**
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/index.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/PatternSelector.tsx`

**Step 1: Add or update a regression test**

Verify the module wrapper still renders pattern controls and delegates shared page/step editing.

**Step 2: Verify RED**

Run the focused StepSequencer tests and confirm the new wrapper expectation fails before rewiring.

**Step 3: Rewire the module wrapper**

Keep:

- `useModuleState`
- live engine module lookup
- start/stop
- pattern add/delete/selection
- Redux `updateProp`

Pass the active pattern pages and callbacks into `StepSequencerEditor`.

**Step 4: Verify GREEN**

Run all grid StepSequencer tests.

### Task 4: Replace the instrument-specific sequencer form

**Files:**
- Modify: `apps/grid/src/components/Instruments/InstrumentEditor.tsx`
- Modify: `apps/grid/src/instruments/editorState.ts`
- Modify: `apps/grid/test/instruments/InstrumentEditor.test.tsx`
- Modify: `apps/grid/test/instruments/editorState.test.ts`

**Step 1: Update failing instrument editor expectations**

Test that the instrument editor:

- Renders shared step buttons and shared step parameter controls.
- Updates note and velocity values through the shared editor.
- Saves edited sequencer content without `ccMessages`.
- Uses only engine-supported resolution and playback mode options.

**Step 2: Verify RED**

Run:

```bash
pnpm -C apps/grid test test/instruments/InstrumentEditor.test.tsx test/instruments/editorState.test.ts
```

Expected: FAIL while the old duplicated form remains.

**Step 3: Wire the instrument adapter**

Remove duplicated sequencer constants, parsing helpers, selected note text state, and form markup. Render `StepSequencerEditor` with instrument capabilities:

- no transport start/stop
- no pattern controls
- no CC editing
- no page add/delete
- fixed 16 steps per page

Write emitted page, step, resolution, playback mode, and loop-length changes back into the selected track document.

**Step 4: Verify GREEN**

Run instrument and shared sequencer tests.

### Task 5: Verify the repository

**Files:**
- Modify only files required by formatting.

**Step 1: Run focused tests**

```bash
pnpm -C apps/grid test test/AudioModule/StepSequencer test/instruments/InstrumentEditor.test.tsx test/instruments/editorState.test.ts
```

**Step 2: Run required repository checks**

```bash
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

**Step 3: Inspect the final diff**

Confirm no unrelated changes, no `packages/ui` public API changes, and no instrument document schema changes.
