# Grid Copy Paste Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-module copy/paste in `apps/grid` so selected modules can be copied and pasted with preserved props, metadata, positions, and internal routing.

**Architecture:** Reuse Redux as the source of truth for selection, module serialization, and edge state. Build a small grid clipboard layer that serializes selected modules plus internal edges, then paste by cloning modules through existing engine-backed thunks and remapping copied routes to the new module ids.

**Tech Stack:** React 19, Redux Toolkit thunks, `@xyflow/react`, Vitest

### Task 1: Define clipboard snapshot and keyboard shortcut behavior

**Files:**
- Create: `apps/grid/src/components/Grid/clipboard.ts`
- Create: `apps/grid/src/components/Grid/gridClipboardShortcut.ts`
- Test: `apps/grid/test/Grid/clipboard.test.ts`
- Test: `apps/grid/test/Grid/gridClipboardShortcut.test.ts`

**Step 1: Write the failing tests**

Add tests that prove:
- selected modules serialize with `name`, `moduleType`, `voices`, `props`, and `position`
- only edges fully contained within the selected module set are included
- paste remaps edge endpoints from old ids to new ids
- copy/paste shortcuts ignore text inputs and non-modifier key combinations

**Step 2: Run tests to verify they fail**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardShortcut.test.ts`

Expected: failing assertions because the clipboard snapshot helpers and shortcut predicates do not exist yet.

**Step 3: Write the minimal implementation**

Implement:
- snapshot types for copied modules and routes
- pure helpers that read selected modules from Redux state and compute a paste offset
- shortcut predicates for `meta/ctrl + c` and `meta/ctrl + v`, gated by `isTextInputLikeTarget`

**Step 4: Run tests to verify they pass**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardShortcut.test.ts`

Expected: PASS

### Task 2: Add paste thunk support to clone modules and routes

**Files:**
- Modify: `apps/grid/src/components/AudioModule/modulesSlice.ts`
- Modify: `apps/grid/src/components/Grid/gridNodesSlice.ts`
- Test: `apps/grid/test/Grid/clipboard.test.ts`

**Step 1: Write the failing test**

Add a thunk-level test that pasting a clipboard snapshot:
- creates new modules through the existing engine-backed path
- returns new module ids
- recreates copied routes between the newly created modules only

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts`

Expected: FAIL because there is no paste thunk and module add does not yet expose the new ids needed for route remapping.

**Step 3: Write the minimal implementation**

Implement:
- return the created module id from `addModule`
- thunk(s) that paste a clipboard snapshot by cloning modules with an offset and reconnecting remapped edges through `Engine.current.addRoute`

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts`

Expected: PASS

### Task 3: Wire window-level copy/paste into the grid

**Files:**
- Modify: `apps/grid/src/components/Grid/index.tsx`
- Modify: `apps/grid/src/hooks/index.ts`
- Test: `apps/grid/test/Grid/gridClipboardShortcut.test.ts`

**Step 1: Write the failing test**

Add a focused test for the handler-facing logic that proves copy/paste is a no-op while typing and recognizes both macOS and Windows/Linux modifier combinations.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/grid exec vitest run test/Grid/gridClipboardShortcut.test.ts`

Expected: FAIL because the predicates or handlers are not wired yet.

**Step 3: Write the minimal implementation**

Implement a `useEffect` in the grid component that:
- listens for `keydown`
- copies the current selection into an in-memory clipboard on `meta/ctrl + c`
- pastes from that clipboard on `meta/ctrl + v`
- ignores typing contexts and empty clipboard/selection cases

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid exec vitest run test/Grid/gridClipboardShortcut.test.ts`

Expected: PASS

### Task 4: Verify end-to-end behavior and repository quality gates

**Files:**
- Modify: `apps/grid/src/components/Grid/clipboard.ts` if needed from test feedback
- Modify: `apps/grid/src/components/Grid/index.tsx` if needed from test feedback

**Step 1: Run targeted grid tests**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardShortcut.test.ts test/AudioModule/modulesSliceUpdate.test.ts`

Expected: PASS

**Step 2: Run full required verification**

Run:
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS
