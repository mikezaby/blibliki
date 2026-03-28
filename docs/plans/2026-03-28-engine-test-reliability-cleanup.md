# Engine Test Reliability Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the engine test suite faster and more reliable by removing fixed wall-clock waits where they are unnecessary, simplifying redundant timing assertions, and standardizing deterministic test waiting.

**Architecture:** The cleanup stays in test code and test utilities. Timer-driven behavior should use fake timers, audio/output assertions should wait on observed state instead of sleeping for arbitrary durations, and scheduler coverage should focus on user-visible behavior rather than exact internal timing offsets.

**Tech Stack:** TypeScript, Vitest, Web Audio test harness, Node MIDI adapter mocks

### Task 1: Add deterministic wait helpers

**Files:**
- Modify: `packages/engine/test/utils/waitForCondition.ts`

**Step 1: Write the failing test**

Use an existing audio-output test that currently depends on `sleep(50)` and identify the expected observable state.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/engine exec vitest run test/modules/Constant.test.ts`
Expected: Existing fixed-wait pattern remains in place and provides the baseline for cleanup.

**Step 3: Write minimal implementation**

Extend the shared wait helper with:
- a microtask helper for queue-based setup
- numeric polling helpers for audio/output assertions

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/engine exec vitest run test/modules/Constant.test.ts test/modules/Gain.test.ts test/modules/Scale.test.ts`
Expected: PASS without fixed-duration sleeps in these files.

**Step 5: Commit**

```bash
git add packages/engine/test/utils/waitForCondition.ts packages/engine/test/modules/Constant.test.ts packages/engine/test/modules/Gain.test.ts packages/engine/test/modules/Scale.test.ts
git commit -m "test: replace fixed audio waits with condition polling"
```

### Task 2: Make Node MIDI hot-plug tests deterministic

**Files:**
- Modify: `packages/engine/test/core/midi/NodeMidiAdapter.test.ts`

**Step 1: Write the failing test**

Replace one real-time wait with fake timer control and confirm the updated test fails until the timer advancement is wired correctly.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/engine exec vitest run test/core/midi/NodeMidiAdapter.test.ts`
Expected: FAIL if the timer advancement is missing or insufficient.

**Step 3: Write minimal implementation**

Switch the file to `vi.useFakeTimers()`, advance the poll interval explicitly, and keep assertions focused on emitted port state.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/engine exec vitest run test/core/midi/NodeMidiAdapter.test.ts`
Expected: PASS without 1-2 second real waits.

**Step 5: Commit**

```bash
git add packages/engine/test/core/midi/NodeMidiAdapter.test.ts
git commit -m "test: make midi hot-plug polling deterministic"
```

### Task 3: Simplify StepSequencer timing coverage

**Files:**
- Modify: `packages/engine/test/modules/StepSequencer.test.ts`

**Step 1: Write the failing test**

Convert the scheduler assertions to wait for captured MIDI events, then assert the externally visible ordering and approximate timing that should hold under CI load.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/engine exec vitest run test/modules/StepSequencer.test.ts`
Expected: FAIL while the file still relies on fixed sleeps or overly strict timing tolerances.

**Step 3: Write minimal implementation**

Keep the regression scenarios that matter:
- loop length only plays active pages
- retriggered notes are not cut off by stale note-offs
- emitted notes arrive in the expected order with reasonable timing tolerance

Remove duplicate “finding” tests that assert exact scheduler internals.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/engine exec vitest run test/modules/StepSequencer.test.ts`
Expected: PASS with fewer, clearer assertions.

**Step 5: Commit**

```bash
git add packages/engine/test/modules/StepSequencer.test.ts
git commit -m "test: simplify step sequencer timing coverage"
```

### Task 4: Verify the cleaned-up suite

**Files:**
- Modify: `packages/engine/test/modules/Envelope.test.ts` (only if required to adopt shared helpers)

**Step 1: Write the failing test**

Stress the timing-sensitive subset after the helper and test rewrites.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/engine exec vitest run test/modules/Constant.test.ts test/modules/Gain.test.ts test/modules/Scale.test.ts test/modules/StepSequencer.test.ts test/core/midi/NodeMidiAdapter.test.ts`
Expected: Any remaining flaky dependency should show up here before broad verification.

**Step 3: Write minimal implementation**

Apply the shared wait helper to any remaining fixed-delay happy-path audio tests that still need cleanup.

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C packages/engine exec vitest run test/modules/Constant.test.ts test/modules/Gain.test.ts test/modules/Scale.test.ts test/modules/StepSequencer.test.ts test/core/midi/NodeMidiAdapter.test.ts`
- `pnpm -C packages/engine exec vitest run`
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS with no timing-related failures introduced by the cleanup.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-28-engine-test-reliability-cleanup.md packages/engine/test/utils/waitForCondition.ts packages/engine/test/core/midi/NodeMidiAdapter.test.ts packages/engine/test/modules/Constant.test.ts packages/engine/test/modules/Gain.test.ts packages/engine/test/modules/Scale.test.ts packages/engine/test/modules/StepSequencer.test.ts
git commit -m "test: stabilize engine timing-sensitive tests"
```
