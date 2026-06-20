# Step Sequencer Copy/Paste Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add predictable, portable copy/paste for single steps, contiguous step ranges, and whole sequencer pages.

**Architecture:** Add persisted CC messages to the instrument document model, then introduce a pure versioned sequencer clipboard module for serialization and replacement semantics. Extend the controlled `StepSequencerEditor` with explicit step/range/page selection, scoped native clipboard events, and a two-button toolbar.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, `@blibliki/engine`, `@blibliki/instrument`, `@blibliki/ui`.

### Task 1: Persist instrument sequencer CC messages

**Files:**
- Modify: `packages/instrument/src/document/types.ts`
- Modify: `packages/instrument/src/document/defaultDocument.ts`
- Modify: `packages/instrument/src/compiler/instrumentRuntimeModules.ts`
- Modify: `packages/instrument/src/document/SavedInstrumentDocument.ts`
- Modify: `apps/grid/src/instruments/document.ts`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/instrumentAdapter.ts`
- Test: `packages/instrument/test/document/defaultDocument.test.ts`
- Test: `packages/instrument/test/compiler/compileInstrumentSequencer.test.ts`
- Test: `packages/instrument/test/InstrumentSession.test.ts`
- Test: `apps/grid/test/AudioModule/StepSequencer/instrumentAdapter.test.ts`

1. Write failing tests proving defaults, compilation, saves, and grid adapters
   preserve CC messages.
2. Run the focused tests and verify failures are caused by the missing field.
3. Add the typed CC field and minimal mapping/validation logic.
4. Rebuild packages and rerun focused tests.

### Task 2: Implement pure clipboard semantics

**Files:**
- Create: `apps/grid/src/components/AudioModule/StepSequencer/clipboard.ts`
- Create: `apps/grid/test/AudioModule/StepSequencer/clipboard.test.ts`

1. Write failing tests for versioned step/page serialization, invalid payloads,
   deep cloning, partial step paste, and page-name preservation.
2. Run the focused test and verify RED.
3. Implement the smallest pure clipboard API needed by the editor.
4. Run the focused test and verify GREEN.

### Task 3: Add explicit selection UX

**Files:**
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/StepSequencerEditor.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/PageNavigator.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/StepGrid.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/StepButton.tsx`
- Test: `apps/grid/test/AudioModule/StepSequencer/StepSequencerEditor.test.tsx`
- Test: `apps/grid/test/AudioModule/StepSequencer/StepButton.test.tsx`

1. Write failing interaction tests for click, Shift-click range, page scope, page
   change reset, and selection styling.
2. Run focused tests and verify RED.
3. Implement explicit selection state and visual props.
4. Run focused tests and verify GREEN.

### Task 4: Add toolbar and scoped clipboard events

**Files:**
- Create: `apps/grid/src/components/AudioModule/StepSequencer/ClipboardToolbar.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/StepSequencerEditor.tsx`
- Modify: `apps/grid/src/components/Grid/gridClipboardShortcut.ts`
- Test: `apps/grid/test/AudioModule/StepSequencer/StepSequencerEditor.test.tsx`
- Test: `apps/grid/test/Grid/gridClipboardShortcut.test.ts`

1. Write failing tests for toolbar labels/actions, native copy/paste events,
   partial-paste feedback, incompatible scope, text-input preservation, and
   preventing the grid clipboard from handling sequencer events.
2. Run focused tests and verify RED.
3. Implement the two-button toolbar, clipboard permission fallback, scoped
   handlers, and inline status.
4. Run focused tests and verify GREEN.

### Task 5: Verify integration and quality gates

1. Run all StepSequencer, instrument, and grid clipboard tests.
2. Run `pnpm build:packages`.
3. Run `pnpm tsc`, `pnpm lint`, `pnpm test`, and `pnpm format`.
4. Start the grid app and visually verify module and instrument sequencers when
   the in-app browser is available.
5. Inspect the final diff for unrelated changes and document any pre-existing
   flaky audio-test behavior separately.
