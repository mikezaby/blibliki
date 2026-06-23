# Launch Control Background Step LED Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the Launch Control XL3 sequencer playhead LED updating while the browser tab is unfocused.

**Architecture:** Keep `requestAnimationFrame` batching for generic UI state updates, but publish module state changes synchronously from the engine. `InstrumentSession` listens for state changes from the active `StepSequencer` and updates the hardware LEDs directly from that transport-driven event, without adding a second polling timer.

**Tech Stack:** TypeScript, `@blibliki/engine` module state observers, Vitest, pnpm workspaces.

### Task 1: Reproduce the Deferred State Notification

**Files:**
- Modify: `packages/engine/test/modules/StepSequencer.test.ts`
- Modify: `packages/instrument/test/InstrumentSession.test.ts`

**Step 1: Write the failing test**

Add an engine test that starts a real `StepSequencer` and expects a synchronous engine state callback when transport playback advances the current step.

Add an instrument test that creates a sequencer-edit session with a live MIDI output, captures the engine state callback, and emits an active sequencer state update without invoking `engine.onPropsUpdate`.

Assert that the new step receives the playhead LED value and disposing the session unregisters the exact state callback.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm test test/InstrumentSession.test.ts
```

Expected: FAIL because the engine does not publish immediate state updates and `InstrumentSession` cannot subscribe to them.

### Task 2: Subscribe Hardware LEDs to Immediate Sequencer State

**Files:**
- Modify: `packages/engine/src/Engine.ts`
- Modify: `packages/engine/src/core/module/Module.ts`
- Modify: `packages/engine/src/index.ts`
- Modify: `packages/instrument/src/InstrumentSession.ts`
- Test: `packages/engine/test/modules/StepSequencer.test.ts`
- Test: `packages/instrument/test/InstrumentSession.test.ts`

**Step 1: Implement the minimal fix**

Add engine state observer registration and removal methods. Notify those observers synchronously after a module state setter applies a real change.

Have `InstrumentSession` subscribe with a stable callback that:

1. exits after disposal;
2. ignores non-sequencer modules;
3. ignores sequencers outside the active track;
4. calls the existing Launch Control step LED synchronization.

Remove the transport clock polling workaround and unregister the state callback in `dispose()`.

**Step 2: Run the focused test**

Run:

```bash
pnpm test test/InstrumentSession.test.ts
```

Expected: PASS.

### Task 3: Verify the Repository

**Files:**
- Verify only; no unrelated changes.

**Step 1: Rebuild packages**

Run `pnpm build:packages`.

**Step 2: Run required checks**

Run:

```bash
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

Expected: all checks pass. If existing timing-sensitive audio tests fail in the parallel full suite, rerun the failed files independently and report both results.
