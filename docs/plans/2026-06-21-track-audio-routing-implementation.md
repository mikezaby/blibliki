# Track-to-Track Audio Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow an instrument track to receive another enabled track's pre-volume audio in parallel or serial mode.

**Architecture:** The receiving track stores an `audioSource` discriminated union. `Track` compiles either the existing internal-source layout or a processing layout that starts at the filter. A pure `instrumentAudioRouting` compiler derives track-to-track routes and direct master routes from enabled track documents without graph validation or automatic repair.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, `@blibliki/engine` serialized modules/routes.

### Task 1: Add the document contract and defaults

**Files:**

- Modify: `packages/instrument/src/document/types.ts`
- Modify: `packages/instrument/src/document/defaultDocument.ts`
- Modify: `packages/instrument/src/index.ts`
- Modify: `packages/instrument/test/document/defaultDocument.test.ts`
- Modify: `packages/instrument/test/document/InstrumentDocument.test.ts`

**Step 1: Write the failing tests**

Add assertions that every default track has:

```ts
audioSource: { type: "internal" }
```

Add the audio source field to the projected default document shape.

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C packages/instrument test test/document/defaultDocument.test.ts test/document/InstrumentDocument.test.ts
```

Expected: FAIL because `audioSource` is missing.

**Step 3: Write the minimal implementation**

Add:

```ts
export type InstrumentTrackAudioSource =
  | { type: "internal" }
  | {
      type: "track";
      trackKey: string;
      mode: "parallel" | "serial";
    };
```

Make `audioSource` optional on `InstrumentTrackDocument` for backward compatibility. Add the explicit internal value to newly created default tracks and export the public type.

**Step 4: Run tests to verify they pass**

Run the two document test files again, then run:

```bash
pnpm -C packages/instrument tsc --noEmit
```

Expected: PASS.

### Task 2: Add processing-track construction and audio endpoints

**Files:**

- Modify: `packages/instrument/src/tracks/Track.ts`
- Modify: `packages/instrument/src/tracks/createTrackFromDocument.ts`
- Modify: `packages/instrument/test/tracks/Track.test.ts`
- Modify: `packages/instrument/test/tracks/TrackIO.test.ts`
- Modify: `packages/instrument/test/compiler/compileTrack.test.ts`

**Step 1: Write failing processing-layout tests**

Construct:

```ts
new Track("track-2", { audioSourceType: "track" })
```

Assert:

- blocks omit `source` and `amp`,
- routes start at `filter -> fx1`,
- pages are `filterMod` and `fx`,
- input is `audio in -> filter.in`,
- no MIDI input exists,
- a configured step sequencer remains available for CC automation,
- `audio send -> fx4.out`,
- `audio out -> trackGain.out`,
- compiled modules omit source and amp modules.

Update the internal track IO expectation to include `audio send`.

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C packages/instrument test test/tracks/Track.test.ts test/tracks/TrackIO.test.ts test/compiler/compileTrack.test.ts
```

Expected: FAIL because the option and IO do not exist.

**Step 3: Write the minimal implementation**

Add a narrow construction option:

```ts
audioSourceType?: "internal" | "track";
```

Keep shared filter/LFO/FX/track-gain creation in `Track`. Only create source, amp, MIDI input, their routes, and `sourceAmp` page for internal tracks. For processing tracks, add `audio in` pointing at `filter.in`.

Add both outputs for every layout:

```ts
audio send -> fx4.out
audio out -> trackGain.out
```

Normalize `trackDocument.audioSource?.type ?? "internal"` in `createTrackFromDocument`.

**Step 4: Run tests to verify they pass**

Run the three focused test files again.

Expected: PASS.

### Task 3: Stop creating voice note runtime for processing tracks

**Files:**

- Modify: `packages/instrument/src/compiler/instrumentRuntimeRoutes.ts`
- Modify: `packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts`

**Step 1: Write the failing test**

Create a document where track 2 uses track 1 as its audio source. Assert the patch does not contain:

```text
track-2.runtime.midiChannelFilter
track-2.runtime.voiceScheduler
```

When `noteSource` is `stepSequencer`, assert the patch still contains
`track-2.runtime.stepSequencer` and permits sequencer-edit mode. The sequencer
is retained for CC automation even though note routes into source/amp are
omitted.

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm -C packages/instrument test test/compiler/createInstrumentEnginePatch.test.ts
```

Expected: FAIL because processing tracks still create voice note runtime or
incorrectly suppress the sequencer.

**Step 3: Write the minimal implementation**

Return an empty voice note runtime when:

```ts
trackDocument.audioSource?.type === "track"
```

Treat missing `audioSource` as internal.

Keep step-sequencer module creation and sequencer-edit navigation based on
`noteSource`, including for processing tracks.

**Step 4: Run the test to verify it passes**

Run the focused compiler test again.

Expected: PASS.

### Task 4: Compile parallel and serial instrument audio routes

**Files:**

- Create: `packages/instrument/src/compiler/instrumentAudioRouting.ts`
- Modify: `packages/instrument/src/compiler/instrumentRuntimeRoutes.ts`
- Modify: `packages/instrument/src/compiler/createInstrumentEnginePatch.ts`
- Modify: `packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts`

**Step 1: Write failing routing tests**

Add behavior tests for:

1. Parallel `A -> B`:
   - `A.fx4.main.out -> B.filter.main.in`
   - A and B both route `trackGain.main.out -> masterFilter.in`
2. Serial `A -> B`:
   - `A.fx4.main.out -> B.filter.main.in`
   - A does not route to master
   - B routes to master
3. Serial chain `A -> B -> C`:
   - A send feeds B
   - B send feeds C
   - only C routes to master
4. Serial plus parallel branches from A:
   - all branch routes exist
   - A direct master route is suppressed
5. Disabled B in `A -> B -> C`:
   - A routes to master
   - C still routes to master but has no incoming route
6. Missing source:
   - destination compiles and routes to master
   - no track-to-track route is created
7. Self-route/cycle:
   - routes compile without validation errors

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C packages/instrument test test/compiler/createInstrumentEnginePatch.test.ts
```

Expected: FAIL because all enabled tracks currently route directly to master and no track-to-track routes exist.

**Step 3: Write the minimal pure compiler**

Create `instrumentAudioRouting.ts` with functions that:

- inspect enabled `InstrumentTrackDocument` values,
- find matching compiled `BaseTrack` instances by key,
- create routes from source `audio send` to destination `audio in`,
- collect source keys referenced by enabled serial destinations,
- route `audio out` to the master only when the track key is not in that serial-source set,
- silently skip missing/disabled source references,
- perform no graph validation.

Use existing `scopeTrackIO`, `createExpandedRoutes`, and deterministic runtime route IDs.

Replace `createMasterRoutes`' unconditional track fan-in with the derived audio routes, while preserving the master filter/delay/reverb/volume/master chain.

**Step 4: Run tests to verify they pass**

Run the focused compiler test.

Expected: PASS.

### Task 5: Preserve normalized metadata and navigation behavior

**Files:**

- Modify: `packages/instrument/src/compiler/instrumentTypes.ts`
- Modify: `packages/instrument/src/compiler/compileInstrument.ts`
- Modify: `packages/instrument/src/core/InstrumentNavigation.ts`
- Modify: `packages/instrument/src/document/SavedInstrumentDocument.ts`
- Modify: `packages/instrument/test/compiler/compileInstrument.test.ts`
- Modify: `packages/instrument/test/core/InstrumentNavigation.test.ts`
- Modify: `packages/instrument/test/document/SavedInstrumentDocument.test.ts`

**Step 1: Write failing tests**

Assert:

- compiled tracks expose normalized `{ type: "internal" }` for old/missing values,
- compiled processing tracks preserve their track source metadata,
- saving writes explicit normalized `audioSource`,
- selecting a processing track with active page `sourceAmp` falls back to that track's first page (`filterMod`),
- page navigation uses the active track's page list.

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm -C packages/instrument test test/compiler/compileInstrument.test.ts test/core/InstrumentNavigation.test.ts test/document/SavedInstrumentDocument.test.ts
```

Expected: FAIL because normalized metadata and active-track page selection are not implemented.

**Step 3: Write the minimal implementation**

- Add `audioSource` to `CompiledInstrumentTrack`.
- Normalize missing values to `{ type: "internal" }` during compilation.
- Write normalized `audioSource` in saved tracks, including disabled tracks.
- Change navigation page lookup to use the active compiled track.
- When changing tracks, retain the current page only if the destination track owns it; otherwise select the destination's first page.

**Step 4: Run tests to verify they pass**

Run the three focused files again.

Expected: PASS.

### Task 6: Full verification and cleanup

**Files:**

- Modify only files required by prior tasks.

**Step 1: Format**

Run:

```bash
pnpm format
```

**Step 2: Package verification**

Run:

```bash
pnpm -C packages/instrument test
pnpm -C packages/instrument tsc --noEmit
pnpm -C packages/instrument lint
pnpm build:packages
```

Expected: all commands pass.

**Step 3: Monorepo verification**

Run:

```bash
pnpm tsc
pnpm lint
pnpm test
```

Expected: typecheck and lint pass. Tests should pass; if the known timing-sensitive engine/CoreAudio issue recurs, report exact evidence and keep instrument-package verification separate.

**Step 4: Review scope**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Confirm only the routing implementation, tests, and plan changed.
