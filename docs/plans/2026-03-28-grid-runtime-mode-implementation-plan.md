# Grid Runtime Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a grid runtime-only mode that loads and runs a patch without loading React Flow, so engine performance can be measured without the editor canvas in the boot path.

**Architecture:** Keep patch loading in `apps/grid/src/patchSlice.ts`, but add an explicit patch view mode so the loader can skip grid-node hydration in runtime mode. Move React Flow ownership into the grid component chunk, then lazy-load that chunk from the routes so the runtime route never imports `@xyflow/react` unless the editor or debug canvas is actually rendered.

**Tech Stack:** TypeScript, React 19, TanStack Router, Redux Toolkit, Vitest, Vite code splitting

### Task 1: Define the patch view mode contract

**Files:**
- Modify: `apps/grid/src/routes/patch.$patchId.tsx`
- Test: `apps/grid/test/patch/patchRouteViewMode.test.ts`

**Step 1: Write the failing test**

Add pure tests for a route helper that normalizes the patch route search state:
- default search resolves to editor mode
- `mode=runtime` resolves to runtime mode
- unknown search values fall back to editor mode

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/grid test -- test/patch/patchRouteViewMode.test.ts`
Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Add:
- a `PatchViewMode` union for `"editor" | "runtime"`
- a search validator/normalizer in `apps/grid/src/routes/patch.$patchId.tsx`
- an exported pure helper so the behavior can stay testable without router setup

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid test -- test/patch/patchRouteViewMode.test.ts`
Expected: PASS with the new route mode normalization.

**Step 5: Commit**

```bash
git add apps/grid/src/routes/patch.$patchId.tsx apps/grid/test/patch/patchRouteViewMode.test.ts
git commit -m "feat: define grid runtime route mode"
```

### Task 2: Make patch loading runtime-aware

**Files:**
- Modify: `apps/grid/src/patchSlice.ts`
- Test: `apps/grid/test/patch/loadByIdEngineBootstrap.test.ts`

**Step 1: Write the failing test**

Extend the existing patch bootstrap test with a runtime-mode case that proves:
- engine initialization still happens
- module loading still happens
- grid-node hydration is skipped in runtime mode

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/grid test -- test/patch/loadByIdEngineBootstrap.test.ts`
Expected: FAIL because `loadById` always dispatches `setGridNodes`.

**Step 3: Write minimal implementation**

Add an optional mode/options argument to:
- `loadById`
- `loadInstrumentDebugById` only if type sharing requires it
- `load`

In runtime mode, keep BPM/module hydration but skip `setGridNodes`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid test -- test/patch/loadByIdEngineBootstrap.test.ts`
Expected: PASS for both editor and runtime cases.

**Step 5: Commit**

```bash
git add apps/grid/src/patchSlice.ts apps/grid/test/patch/loadByIdEngineBootstrap.test.ts
git commit -m "feat: skip grid hydration in runtime patch mode"
```

### Task 3: Move React Flow behind the grid chunk

**Files:**
- Modify: `apps/grid/src/Providers/index.tsx`
- Modify: `apps/grid/src/components/Grid/index.tsx`
- Modify: `apps/grid/src/styles/index.css`
- Modify: `apps/grid/src/routes/patch.$patchId.tsx`
- Modify: `apps/grid/src/routes/instrument.$instrumentId.debug.tsx`

**Step 1: Write the failing test**

Use the route mode helper test as the red signal for editor/runtime branching, then add a minimal rendering assertion if needed for a runtime-only surface component.

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C apps/grid test -- test/patch/patchRouteViewMode.test.ts`
- `pnpm -C apps/grid test -- test/patch/loadByIdEngineBootstrap.test.ts`

Expected: One or both tests fail until the runtime branch and loader behavior are implemented together.

**Step 3: Write minimal implementation**

Make React Flow editor-only by:
- removing `ReactFlowProvider` from app-wide providers
- importing React Flow CSS from the grid chunk instead of global styles
- wrapping the grid canvas with `ReactFlowProvider` inside the grid component
- lazy-loading the grid component from the patch editor route and instrument debug route
- rendering a minimal runtime surface for `mode=runtime`

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C apps/grid test -- test/patch/patchRouteViewMode.test.ts`
- `pnpm -C apps/grid test -- test/patch/loadByIdEngineBootstrap.test.ts`

Expected: PASS, with runtime mode taking the headless route and editor mode still taking the grid route.

**Step 5: Commit**

```bash
git add apps/grid/src/Providers/index.tsx apps/grid/src/components/Grid/index.tsx apps/grid/src/styles/index.css apps/grid/src/routes/patch.$patchId.tsx apps/grid/src/routes/instrument.$instrumentId.debug.tsx
git commit -m "feat: lazy load grid editor for runtime mode"
```

### Task 4: Verify runtime mode end to end

**Files:**
- Modify: `docs/plans/2026-03-28-grid-runtime-mode-implementation-plan.md` (only if commands or scope change during implementation)

**Step 1: Write the failing test**

Run the targeted grid tests first so any remaining route/runtime mismatch fails before repo-wide verification.

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C apps/grid test -- test/patch/patchRouteViewMode.test.ts`
- `pnpm -C apps/grid test -- test/patch/loadByIdEngineBootstrap.test.ts`

Expected: No failure at this stage; if anything still fails, fix it before broad verification.

**Step 3: Write minimal implementation**

Only make follow-up changes if verification exposes gaps in the runtime branch or editor branch.

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C apps/grid test -- test/patch/patchRouteViewMode.test.ts`
- `pnpm -C apps/grid test -- test/patch/loadByIdEngineBootstrap.test.ts`
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS, with the new runtime mode integrated and repo checks clean.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-28-grid-runtime-mode-implementation-plan.md apps/grid/src/Providers/index.tsx apps/grid/src/components/Grid/index.tsx apps/grid/src/patchSlice.ts apps/grid/src/routes/patch.$patchId.tsx apps/grid/src/routes/instrument.$instrumentId.debug.tsx apps/grid/src/styles/index.css apps/grid/test/patch/patchRouteViewMode.test.ts apps/grid/test/patch/loadByIdEngineBootstrap.test.ts
git commit -m "feat: add runtime-only grid patch mode"
```
