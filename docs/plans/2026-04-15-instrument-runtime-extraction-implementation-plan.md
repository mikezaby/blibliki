# Instrument Runtime Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the portable instrument runtime, controller, and display-state logic out of `packages/pi` into reusable packages so `pi` keeps only the Node/CLI/device layer and `grid` can reuse the performance runtime later.

**Architecture:** Treat `@blibliki/instrument` as the owner of instrument document compilation plus browser-safe runtime behavior. Move the Launch Control runtime navigation, live display shaping, and sequencer edit helpers into `packages/instrument`. Move the `InstrumentDisplayState -> DisplayProtocolState` adapter into `packages/display-protocol` because it belongs to the display contract, not the instrument domain. Re-export the moved APIs from `packages/pi` as compatibility shims where needed. Leave config, Firebase/bootstrap, OSC/UDP, terminal rendering, prompt/CLI, and persistence in `packages/pi`.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, tsup

### Task 1: Add failing runtime extraction tests in `packages/instrument` and `packages/display-protocol`

**Files:**
- Create: `packages/instrument/test/runtime/instrumentRuntime.test.ts`
- Create: `packages/instrument/test/runtime/liveDisplayState.test.ts`
- Create: `packages/instrument/test/runtime/controllerRuntime.test.ts`
- Create: `packages/display-protocol/test/instrumentDisplayStateToProtocol.test.ts`
- Modify: `packages/instrument/src/index.ts`

**Step 1: Write the failing test**

Port representative runtime tests from `packages/pi/test/` into `packages/instrument/test/runtime/`:
- runtime navigation and active-page resolution
- live display slot/value hydration
- controller CC reduction for navigation and seq-edit mode
- display protocol normalization from instrument display state in `packages/display-protocol`

Import the APIs from `@/runtime/...` or package exports that do not exist yet so the tests fail for the missing extraction.

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C packages/instrument test -- test/runtime/instrumentRuntime.test.ts`
- `pnpm -C packages/instrument test -- test/runtime/liveDisplayState.test.ts`
- `pnpm -C packages/instrument test -- test/runtime/controllerRuntime.test.ts`
- `pnpm -C packages/display-protocol test -- test/instrumentDisplayStateToProtocol.test.ts`

Expected: FAIL because the runtime modules are still only implemented in `packages/pi`.

**Step 3: Write minimal implementation**

Add export stubs or the first extracted module only as needed to move from missing-module failures to behavior failures.

**Step 4: Run test to verify it passes**

Run the same four commands and confirm each test passes after extraction is complete.

**Step 5: Commit**

```bash
git add packages/instrument/src/index.ts packages/instrument/test/runtime
git commit -m "test: define instrument runtime extraction coverage"
```

### Task 2: Move portable instrument runtime modules into `packages/instrument`

**Files:**
- Create: `packages/instrument/src/runtime/instrumentRuntime.ts`
- Create: `packages/instrument/src/runtime/liveDisplayState.ts`
- Create: `packages/instrument/src/runtime/controllerRuntime.ts`
- Create: `packages/instrument/src/runtime/sequencerEdit.ts`
- Modify: `packages/instrument/src/index.ts`

**Step 1: Write the failing test**

Use the new runtime tests as the failing signal. Do not add more production code before at least one of the new tests fails for the expected missing behavior.

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C packages/instrument test -- test/runtime/instrumentRuntime.test.ts`
- `pnpm -C packages/instrument test -- test/runtime/liveDisplayState.test.ts`

Expected: FAIL until the extracted files exist and export the expected APIs.

**Step 3: Write minimal implementation**

Copy the browser-safe logic from `packages/pi/src/` into `packages/instrument/src/runtime/` and update imports to use local instrument package paths:
- `instrumentRuntime.ts`
- `liveDisplayState.ts`
- `controllerRuntime.ts`
- `sequencerEdit.ts`

Export the new runtime APIs from `packages/instrument/src/index.ts`.

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C packages/instrument test -- test/runtime/instrumentRuntime.test.ts`
- `pnpm -C packages/instrument test -- test/runtime/liveDisplayState.test.ts`
- `pnpm -C packages/instrument test -- test/runtime/controllerRuntime.test.ts`

Expected: PASS with the runtime logic now owned by `@blibliki/instrument`.

**Step 5: Commit**

```bash
git add packages/instrument/src/index.ts packages/instrument/src/runtime packages/instrument/test/runtime
git commit -m "feat: move portable instrument runtime into instrument package"
```

### Task 3: Move the display-protocol adapter into `packages/display-protocol`

**Files:**
- Create: `packages/display-protocol/src/instrumentDisplayState.ts`
- Modify: `packages/display-protocol/src/index.ts`
- Modify: `packages/display-protocol/package.json`
- Test: `packages/display-protocol/test/instrumentDisplayStateToProtocol.test.ts`

**Step 1: Write the failing test**

Use the new display-protocol test as the red signal for the adapter move.

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C packages/display-protocol test -- test/instrumentDisplayStateToProtocol.test.ts`

Expected: FAIL because `instrumentDisplayStateToProtocol` is not exported from `@blibliki/display-protocol` yet.

**Step 3: Write minimal implementation**

Move `instrumentDisplayStateToProtocol` out of `packages/pi` and into `packages/display-protocol/src/instrumentDisplayState.ts`, then export it from `packages/display-protocol/src/index.ts`. Add the `@blibliki/instrument` workspace dependency because the adapter consumes `InstrumentDisplayState`.

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C packages/display-protocol test -- test/instrumentDisplayStateToProtocol.test.ts`

Expected: PASS with the adapter owned by the display-protocol package.

**Step 5: Commit**

```bash
git add packages/display-protocol/package.json packages/display-protocol/src/index.ts packages/display-protocol/src/instrumentDisplayState.ts packages/display-protocol/test/instrumentDisplayStateToProtocol.test.ts
git commit -m "feat: move display protocol adapter into display-protocol package"
```

### Task 4: Rewire `packages/pi` to the extracted runtime API

**Files:**
- Modify: `packages/pi/src/index.ts`
- Modify: `packages/pi/src/instrumentControllerSession.ts`
- Modify: `packages/pi/src/instrumentSession.ts`
- Delete: `packages/pi/src/instrumentRuntime.ts`
- Delete: `packages/pi/src/liveDisplayState.ts`
- Delete: `packages/pi/src/controllerRuntime.ts`
- Delete: `packages/pi/src/sequencerEdit.ts`
- Delete: `packages/pi/src/displayProtocol.ts`

**Step 1: Write the failing test**

Use the existing `packages/pi` tests as the failing signal by switching imports to `@blibliki/instrument` and removing local runtime implementations.

**Step 2: Run test to verify it fails**

Run:
- `pnpm -C packages/pi test -- test/instrumentSession.test.ts`
- `pnpm -C packages/pi test -- test/instrumentControllerSession.test.ts`

Expected: FAIL until `packages/pi` is updated to consume the extracted runtime exports.

**Step 3: Write minimal implementation**

Update `packages/pi` to import:
- `createInstrumentRuntimeState`
- `createLiveInstrumentDisplayState`
- `reduceInstrumentControllerEvent`
- `applySeqEditEncoderEvent`
- `createSeqEditPageSync`
- `syncSeqEditStepButtonLeds`

from `@blibliki/instrument`, plus:
- `instrumentDisplayStateToProtocol`

from `@blibliki/display-protocol`, then delete the duplicate implementations from `packages/pi`.

Keep `packages/pi` exports stable by re-exporting the moved APIs from `packages/pi/src/index.ts`.

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C packages/pi test -- test/instrumentSession.test.ts`
- `pnpm -C packages/pi test -- test/instrumentControllerSession.test.ts`
- `pnpm -C packages/pi test -- test/displayOutput.test.ts`

Expected: PASS with `packages/pi` acting as a thin Node/device wrapper.

**Step 5: Commit**

```bash
git add packages/pi/src/index.ts packages/pi/src/instrumentControllerSession.ts packages/pi/src/instrumentSession.ts
git rm packages/pi/src/instrumentRuntime.ts packages/pi/src/liveDisplayState.ts packages/pi/src/controllerRuntime.ts packages/pi/src/sequencerEdit.ts packages/pi/src/displayProtocol.ts
git commit -m "refactor: slim pi package to node-specific concerns"
```

### Task 5: Verify package boundaries and workspace health

**Files:**
- Modify: `packages/pi/README.md`
- Modify: `docs/plans/2026-04-15-instrument-runtime-extraction-implementation-plan.md` (only if scope shifts during implementation)

**Step 1: Write the failing test**

Use workspace type-checking and package tests as the final guardrail. If any check fails, treat that as the failing signal and fix the concrete boundary issue instead of widening scope.

**Step 2: Run test to verify it fails**

Run targeted tests first:
- `pnpm -C packages/instrument test`
- `pnpm -C packages/pi test`

Expected: Any remaining boundary or export gap fails here before repo-wide verification.

**Step 3: Write minimal implementation**

Only make follow-up changes needed to:
- fix broken exports or imports
- remove stale documentation that still claims the runtime lives in `packages/pi`
- keep compatibility for existing `@blibliki/pi` consumers

**Step 4: Run test to verify it passes**

Run:
- `pnpm -C packages/instrument test`
- `pnpm -C packages/pi test`
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: PASS, with runtime ownership moved into `@blibliki/instrument` and `@blibliki/pi` narrowed to Node-specific behavior.

**Step 5: Commit**

```bash
git add docs/plans/2026-04-15-instrument-runtime-extraction-implementation-plan.md packages/instrument packages/pi
git commit -m "docs: document instrument runtime package boundary"
```
