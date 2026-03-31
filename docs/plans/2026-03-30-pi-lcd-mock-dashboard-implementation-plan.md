# Pi LCD Mock Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current Pi terminal display dump into a structured mock LCD dashboard that mirrors the `header + 3 bands` layout from the Pi design docs.

**Architecture:** Keep the existing `InstrumentDisplayState` as the single UI contract, then update `packages/pi/src/terminalDisplay.ts` to render that state into a fixed-width dashboard frame instead of a plain log-like dump. Use TDD in `packages/pi/test/terminalDisplay.test.ts` so the new layout is locked down before implementation, and keep `startConfiguredDevice` wiring unchanged so the mock screen remains the default Pi-side development renderer.

**Tech Stack:** TypeScript, Vitest, Node.js terminal output, `@blibliki/pi`, `@blibliki/instrument`

### Task 1: Lock the mock LCD layout in tests

**Files:**
- Modify: `packages/pi/test/terminalDisplay.test.ts`

**Step 1: Write the failing performance-mode layout test**

Replace the current plain-text expectation with an ASCII dashboard frame that includes:

- a bordered header row
- one bordered `GLOBAL` band
- one bordered upper band
- one bordered lower band
- fixed-width slot cells for all `8` visible controls in each band

The assertion should still prove that inactive and empty slots keep their footprint.

**Step 2: Write the failing seq-edit layout expectation**

Update the seq-edit expectation so the same framed dashboard layout is required for sequencer editing mode too.

**Step 3: Run the focused terminal display test to verify RED**

Run: `pnpm -C packages/pi test test/terminalDisplay.test.ts`

Expected: FAIL because the renderer still returns the old line-based dump.

### Task 2: Implement the mock LCD dashboard renderer

**Files:**
- Modify: `packages/pi/src/terminalDisplay.ts`

**Step 1: Add fixed-width layout helpers**

Introduce small helpers that:

- pad or trim text to a fixed cell width
- render one 8-slot row as evenly sized columns
- render a band with a title plus label and value rows

Keep these helpers local to `terminalDisplay.ts`.

**Step 2: Render a controller-shaped dashboard**

Update `renderInstrumentDisplayStateToTerminal()` so it returns:

- one bordered header row with instrument name, track name, page summary, and transport state
- one bordered `GLOBAL` band
- one bordered band for `upperBand`
- one bordered band for `lowerBand`

Continue to preserve inactive and empty slot semantics in the rendered text.

**Step 3: Keep session rendering behavior unchanged**

Do not change `createTerminalDisplaySession()` behavior beyond reusing the new renderer output. The clear-screen redraw contract should stay the same.

**Step 4: Run the focused terminal display test to verify GREEN**

Run: `pnpm -C packages/pi test test/terminalDisplay.test.ts`

Expected: PASS

### Task 3: Verify the slice in the Pi package

**Files:**
- Verify only: `packages/pi/test/startConfiguredDevice.test.ts`

**Step 1: Run the targeted Pi package tests**

Run:

- `pnpm -C packages/pi test test/terminalDisplay.test.ts`
- `pnpm -C packages/pi test test/startConfiguredDevice.test.ts`

Expected: PASS

**Step 2: Run full repository verification before finishing**

Run:

- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS, or document any pre-existing failures if they appear outside this slice.
