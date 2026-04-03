# Pi Display Open Surface Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Pi display so it reads as a calmer, border-light instrument surface with stronger at-a-glance value readability.

**Architecture:** Keep the existing display protocol and view-model data contract, and restyle only the Slint renderer. Replace boxed header and parameter cards with a flatter continuous surface that groups information through spacing, tonal contrast, and typography instead of borders.

**Tech Stack:** Slint UI, TypeScript, Vitest, pnpm workspaces

### Task 1: Lock the new visual direction with failing tests

**Files:**
- Modify: `apps/pi-display/test/dashboardHeaderLayout.test.ts`
- Test: `apps/pi-display/test/dashboardHeaderLayout.test.ts`

**Step 1: Write the failing test**

Add assertions that the dashboard source:
- removes cell and band borders
- uses open lane containers instead of framed cards
- increases value typography relative to labels

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/pi-display test test/dashboardHeaderLayout.test.ts`
Expected: FAIL because the current `dashboard.slint` still contains boxed cells and band frames.

**Step 3: Write minimal implementation**

Update the Slint source just enough to satisfy the new open-surface assertions.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/pi-display test test/dashboardHeaderLayout.test.ts`
Expected: PASS

### Task 2: Implement the flatter instrument surface

**Files:**
- Modify: `apps/pi-display/ui/dashboard.slint`
- Modify: `apps/pi-display/src/main.ts`

**Step 1: Simplify the header surface**

- Keep the current `Blibliki`, track/page, and transport information
- Reduce heavy border usage
- Use one calm top strip with horizontal metadata layout

**Step 2: Redesign the parameter lanes**

- Make global, upper, and lower sections feel like lanes on one surface
- Remove per-cell borders
- Keep labels small and values larger for distance readability
- Retain subtle accent behavior for the more active lane/value treatment

**Step 3: Remove dead binding code if the Slint surface no longer needs it**

- Clean up the TypeScript window handle bindings to match the new Slint properties

**Step 4: Run focused display tests**

Run: `pnpm -C apps/pi-display test`
Expected: PASS

### Task 3: Verify the repo after the restyle

**Files:**
- No intentional source changes beyond the files above

**Step 1: Format**

Run: `pnpm format`
Expected: PASS

**Step 2: Typecheck**

Run: `pnpm tsc`
Expected: PASS

**Step 3: Lint**

Run: `pnpm lint`
Expected: PASS

**Step 4: Test**

Run: `pnpm test`
Expected: PASS
