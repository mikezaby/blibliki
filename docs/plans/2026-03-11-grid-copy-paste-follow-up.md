# Grid Copy Paste Follow-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update grid paste so copied module groups appear at the current cursor position and the pasted modules stay selected for immediate adjustment.

**Architecture:** Keep the existing clipboard snapshot and paste thunk, but let paste accept an anchor position in flow coordinates. Compute the copied selection bounds, translate the group so its center lands on the anchor, and update grid selection state so the new nodes become the active selection while previous selections are cleared.

**Tech Stack:** React 19, Redux Toolkit thunks, `@xyflow/react`, Vitest

### Task 1: Add the failing cursor-anchor and selection test

**Files:**
- Modify: `apps/grid/test/Grid/clipboard.test.ts`

**Step 1: Write the failing test**

Add a paste test that proves:
- an `anchorPosition` places the pasted group at the cursor instead of using the default offset
- the newly pasted nodes are marked `selected: true`
- existing selected nodes are cleared

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts`

Expected: FAIL because paste still uses the fixed offset and does not update selection state.

**Step 3: Write the minimal implementation**

Implement:
- anchor-based paste offset calculation from copied group bounds
- grid selection action that selects pasted nodes and clears previous selection
- pointer tracking in the grid component so paste can pass the latest flow-space cursor position

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts`

Expected: PASS

### Task 2: Verify the follow-up on the formatted tree

**Files:**
- Modify: `apps/grid/src/components/Grid/clipboard.ts` if needed from test feedback
- Modify: `apps/grid/src/components/Grid/gridNodesSlice.ts` if needed from test feedback
- Modify: `apps/grid/src/components/Grid/index.tsx` if needed from test feedback

**Step 1: Run targeted grid checks**

Run:
- `pnpm -C apps/grid run tsc`
- `pnpm -C apps/grid run lint`
- `pnpm -C apps/grid exec vitest run test/Grid/clipboard.test.ts test/Grid/gridClipboardShortcut.test.ts`

Expected: PASS

**Step 2: Run full required verification**

Run:
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS
