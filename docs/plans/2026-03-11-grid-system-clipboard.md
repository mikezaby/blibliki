# Grid System Clipboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move grid copy/paste from tab-local memory to the browser/system clipboard so copied module groups can be pasted across tabs and browsers.

**Architecture:** Keep the existing grid snapshot and paste thunk, but serialize clipboard payloads onto the browser clipboard during `copy` and read them back during `paste`. Write both a custom MIME type and a `text/plain` fallback with a Blibliki prefix so same-app pastes work even when browsers do not preserve the custom clipboard type across engines.

**Tech Stack:** React 19, Redux Toolkit thunks, browser `ClipboardEvent`/`DataTransfer`, Vitest

### Task 1: Add failing system clipboard tests

**Files:**
- Modify: `apps/grid/test/Grid/clipboard.test.ts`
- Create: `apps/grid/test/Grid/gridClipboardSystem.test.ts`

**Step 1: Write the failing tests**

Add tests that prove:
- clipboard snapshots are written to both the custom MIME type and `text/plain` fallback
- clipboard snapshots can be read back from either MIME type
- invalid or foreign plain text is ignored
- the grid listens to `copy` and `paste` events rather than using tab-local keydown clipboard handling

**Step 2: Run tests to verify they fail**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardSystem.test.ts`

Expected: FAIL because clipboard serialization helpers and event wiring do not exist yet.

**Step 3: Write the minimal implementation**

Implement:
- clipboard serialization/parsing helpers in `clipboard.ts`
- write-to/read-from `DataTransfer` helpers with text fallback prefix
- `copy` and `paste` event listeners in the grid component
- removal of the in-memory clipboard path

**Step 4: Run tests to verify they pass**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardSystem.test.ts`

Expected: PASS

### Task 2: Verify the system clipboard implementation

**Files:**
- Modify: `apps/grid/src/components/Grid/clipboard.ts` if needed from test feedback
- Modify: `apps/grid/src/components/Grid/index.tsx` if needed from test feedback
- Delete or update: `apps/grid/src/components/Grid/gridClipboardShortcut.ts` if it becomes dead code
- Delete or update: `apps/grid/test/Grid/gridClipboardShortcut.test.ts` if it becomes dead code

**Step 1: Run targeted grid checks**

Run:
- `pnpm -C apps/grid run tsc`
- `pnpm -C apps/grid run lint`
- `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardSystem.test.ts test/Grid/GridBackground.test.ts`

Expected: PASS

**Step 2: Run full required verification**

Run:
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS
