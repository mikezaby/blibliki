# Track Process Benchmark Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a quick benchmark prototype in `packages/pi` that runs one worker process per enabled track, keeps each track active with benchmark MIDI, and lets the parent process coordinate start, stop, tempo, and shutdown.

**Architecture:** Keep the normal instrument runtime untouched. Add a separate benchmark runtime in `packages/pi` that compiles one isolated track patch per track, spawns one Node child per track, and uses IPC messages for orchestration. Use a null audio sink in workers so the prototype can spread CPU work across cores without fighting for the hardware audio device.

**Tech Stack:** TypeScript, Node child processes, Vitest, existing `@blibliki/instrument` track compiler helpers, existing `@blibliki/engine` runtime.

### Task 1: Define Track Worker Specs

**Files:**
- Create: `packages/pi/test/trackProcessBenchmark.test.ts`
- Create: `packages/pi/src/trackProcessBenchmark.ts`

**Step 1: Write the failing test**

Add a test that creates a default instrument document, builds worker specs, and asserts:
- only enabled tracks produce specs
- each spec has a `trackKey`
- each spec patch contains a benchmark MIDI module
- each spec patch routes benchmark MIDI into the track runtime

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts`
Expected: FAIL because worker spec helpers do not exist yet

**Step 3: Write minimal implementation**

Implement a helper in `packages/pi/src/trackProcessBenchmark.ts` that:
- creates one `BaseTrack` per enabled document track
- uses `createTrackEnginePatch(...)`
- injects a benchmark `VirtualMidi` source and runtime routes
- returns serializable worker specs

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts`
Expected: PASS for the new worker spec test

### Task 2: Add Parent Orchestration

**Files:**
- Modify: `packages/pi/test/trackProcessBenchmark.test.ts`
- Modify: `packages/pi/src/trackProcessBenchmark.ts`

**Step 1: Write the failing test**

Add tests that use mocked child processes to assert:
- one worker is spawned per worker spec
- parent sends an `init` message per worker
- `start()` broadcasts start/tempo messages
- `stop()` broadcasts stop
- `dispose()` sends shutdown and clears timers

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts`
Expected: FAIL because orchestration APIs do not exist yet

**Step 3: Write minimal implementation**

Extend `trackProcessBenchmark.ts` with:
- a small parent controller type
- injectable child spawn dependency for tests
- periodic benchmark MIDI scheduling driven by BPM
- `start`, `stop`, and `dispose` methods

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts`
Expected: PASS for orchestration tests

### Task 3: Add Worker Runtime

**Files:**
- Create: `packages/pi/src/trackProcessBenchmarkWorker.ts`
- Modify: `packages/pi/tsup.config.ts`
- Modify: `packages/pi/src/index.ts`

**Step 1: Write the failing test**

Add a focused test that validates the worker-side init handler loads a patch with a null sink and records benchmark MIDI module ids needed for note events.

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts`
Expected: FAIL because the worker runtime helper does not exist yet

**Step 3: Write minimal implementation**

Implement a worker entry that:
- receives IPC init messages
- loads the patch into an `Engine` backed by `Context({ sinkId: "none" })`
- handles `start`, `stop`, `setBpm`, `noteOn`, `noteOff`, and `shutdown`
- emits `ready` and `error` messages

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts`
Expected: PASS for worker runtime tests

### Task 4: Add a CLI Entry Point

**Files:**
- Modify: `packages/pi/test/cliMain.test.ts`
- Create: `packages/pi/test/startTrackProcessBenchmark.test.ts`
- Modify: `packages/pi/src/cliMain.ts`
- Modify: `packages/pi/src/index.ts`
- Create: `packages/pi/src/startTrackProcessBenchmark.ts`

**Step 1: Write the failing test**

Add tests that assert:
- `runCli(["benchmark-tracks"])` calls the new benchmark startup path
- benchmark startup creates the default playable instrument document
- benchmark startup disposes workers on shutdown

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/pi test test/cliMain.test.ts test/startTrackProcessBenchmark.test.ts`
Expected: FAIL because the CLI and startup helpers do not exist yet

**Step 3: Write minimal implementation**

Add a new CLI subcommand and startup helper that:
- builds a default benchmark document
- starts the track-process benchmark
- logs basic worker information
- waits for `SIGINT` or `SIGTERM`

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/pi test test/cliMain.test.ts test/startTrackProcessBenchmark.test.ts`
Expected: PASS for the new startup tests

### Task 5: Verify the Prototype

**Files:**
- Modify: `packages/pi/package.json` only if an explicit script is needed

**Step 1: Run targeted package tests**

Run: `pnpm -C packages/pi test test/trackProcessBenchmark.test.ts test/startTrackProcessBenchmark.test.ts test/cliMain.test.ts`
Expected: PASS

**Step 2: Run the full Pi package suite**

Run: `pnpm -C packages/pi test`
Expected: PASS

**Step 3: Run required repo verification**

Run:
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: report actual results and distinguish prototype-related failures from unrelated repo issues if any appear
