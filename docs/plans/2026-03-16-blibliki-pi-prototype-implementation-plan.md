# Blibliki Pi Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first end-to-end Blibliki Pi prototype loop: author a constrained Instrument in Grid, compile it into an engine patch, assign it to a device, boot it in `packages/pi`, drive it from Launch Control XL3, and render a real display state stream for the LCD process.

**Per-task QA handoff:** at the end of every implementation task, include concrete manual test scenarios that verify the expected behavior works. Do not finish a task only with a change summary; always provide explicit checks the user can run next.

**Architecture:** The instrument document is the source of truth. A new shared `@blibliki/instrument` package owns the document schema, defaults, semantic slot bindings, first template, first hardware profile, and compiler. Grid edits and saves that document, the Pi runtime recompiles it locally at boot, and the controller/display layers consume the compiler’s semantic binding output rather than inferring behavior from a free graph.

**Tech Stack:** TypeScript, pnpm workspaces, `@blibliki/engine`, `@blibliki/models`, React + TanStack Router in `apps/grid`, Node runtime in `packages/pi`, child-process display bridge, Vitest.

## Current Workspace State

This plan assumes you are starting from the current uncommitted prototype work already present in the repository. The following areas have partial code and should be treated as a starting point, not as completed implementation:

- New package scaffold: `packages/instrument/`
- New model: `packages/models/src/Instrument.ts`
- Device persistence change: `packages/models/src/Device.ts`
- Grid authoring route and UI: `apps/grid/src/routes/instrument.$instrumentId.tsx`, `apps/grid/src/components/Instrument/`
- Pi runtime/session scaffolding: `packages/pi/src/runtime/`
- Pi boot-path changes: `packages/pi/src/index.ts`
- MIDI channel getters: `packages/engine/src/core/midi/Message.ts`, `packages/engine/src/core/midi/MidiEvent.ts`

The current worktree is intentionally incomplete and does **not** compile yet. The first task is to stabilize the shared package and rebuild a clean dependency chain outward from it.

## Non-Goals For This Plan

- Do not build full local editing on the Pi.
- Do not build multi-template authoring.
- Do not build deep modulation matrix authoring.
- Do not integrate a production Rust/Slint LCD in the same batch as schema/compiler stabilization.
- Do not refactor unrelated engine or Grid systems.

## Execution Order

Implement in this order:

1. Stabilize `@blibliki/instrument`
2. Repair `@blibliki/models`
3. Repair Grid authoring integration
4. Repair Pi runtime/controller/display integration
5. Run full verification

Do not work ahead of the dependency chain. If `packages/instrument` is broken, do not debug Grid or Pi runtime first.

## Task 1: Stabilize `@blibliki/instrument`

**Files:**
- Review: `packages/instrument/src/types.ts`
- Review: `packages/instrument/src/defaults.ts`
- Review: `packages/instrument/src/compiler.ts`
- Review: `packages/instrument/src/index.ts`
- Review: `packages/instrument/test/compiler.test.ts`
- Reference: `packages/engine/src/index.ts`
- Reference: `packages/engine/src/modules/index.ts`
- Reference: `packages/transport/src/index.ts`

**Step 1: Write or update failing shared-package tests**

Use `packages/instrument/test/compiler.test.ts` to cover exactly these prototype guarantees:

- default document validates
- document has `8` tracks and `8` global slots
- compiler produces deterministic module ids
- compiler produces semantic binding keys for globals, source controls, FX controls, and track gain
- compiler respects the fixed track/global skeleton

Add one test per guarantee. Keep the test names explicit.

**Step 2: Run the package tests and the package typecheck**

Run:

```bash
pnpm -C packages/instrument test
pnpm -C packages/instrument tsc
```

Expected:

- tests fail for real compiler/schema reasons
- typecheck fails in the package only

If the tests pass immediately, tighten them until they catch the broken behavior.

**Step 3: Fix import/export mismatches against engine and transport**

Repair the package so it only imports public exports that actually exist.

Known checks:

- `packages/engine/src/index.ts` does **not** currently export every symbol directly used in the new compiler code
- `ReverbType` must be exported from the engine root if the shared package needs it there
- `MidiEvent` and `MidiEventType` are not currently exported from `@blibliki/engine`; decide whether to export them or import them from a narrower engine path later in the runtime task
- `StepConfig.duration` and `StepSequencerConfig.resolution` are `Division` values, not `Resolution` enum values

Prefer fixing the shared package imports first. Only widen engine exports if the symbol genuinely belongs in the public engine API.

**Step 4: Make the schema internally consistent**

Ensure these shapes are coherent:

- `InstrumentDocument`
- `TrackConfig`
- `SlotConfig`
- `StepSequencerConfig`
- `EffectSlotConfig`
- `TrackRuntimeMetadata`
- `ResolvedBinding`

Keep the prototype schema narrow. Do not add fields unless they remove ambiguity needed by the compiler or runtime.

**Step 5: Make slot targets and binding keys consistent**

Right now the partial work mixes targets like:

- `track.source.wave`
- `track.source.wavetable.position`
- `track.fx.time`
- `track.${index}.fx.${effectIndex}.time`

Pick one stable semantic-target contract and apply it everywhere:

- document defaults
- compiler binding generation
- Grid slot lookup
- runtime slot lookup

Recommended prototype shape:

- track-local document targets stay semantic and unscoped, for example `track.source.wave`
- compiler namespaces them per track, for example `track.0.source.wave`
- FX targets must include enough semantic detail to disambiguate the slot, for example `track.fx.0.time` or `track.fxA.left.time`

Do not leave “document key vs compiler key” translation vague.

**Step 6: Fix compiler defaults and module property names**

Check every generated module prop against real engine schemas.

Known risk areas:

- `Filter` uses `Q`, not `resonance`
- `Reverb` prop names and enum values must match the module schema exactly
- `Delay` prop names must match the module schema exactly
- `Resolution` vs musical `Division` strings
- `PlaybackMode` values must match the transport/module contract

Use `packages/engine/src/modules/*` as the source of truth.

**Step 7: Fix unused imports, dead locals, and impossible type branches**

The partial compiler currently has unused imports and a `never`-ish narrowing problem around `schema.kind`. Clean those only after the actual control-schema logic is correct.

**Step 8: Re-run package tests and typecheck**

Run:

```bash
pnpm -C packages/instrument test
pnpm -C packages/instrument tsc
pnpm -C packages/instrument lint
```

Expected:

- tests pass
- package typecheck passes
- package lint passes

**Step 9: Build the package**

Run:

```bash
pnpm -C packages/instrument build
```

Expected:

- `packages/instrument/dist/` exists
- `dist/index.d.ts` exists

**Step 10: Commit**

```bash
git add packages/instrument
git commit -m "feat: add instrument shared package foundation"
```

## Task 2: Repair `@blibliki/models`

**Files:**
- Modify: `packages/models/src/Instrument.ts`
- Modify: `packages/models/src/Device.ts`
- Modify: `packages/models/src/index.ts`
- Modify: `packages/models/package.json`
- Reference: `packages/models/src/Patch.ts`
- Reference: `packages/models/src/Root.ts`

**Step 1: Write a failing model-level test or smoke check**

If `packages/models` already has a test pattern, follow it. If not, add a narrow smoke test in the closest existing test location or keep this as a typed smoke check with `tsc`.

Minimum behaviors to verify:

- `Instrument` model can be constructed
- `Device` accepts `instrumentId`
- legacy `patchId` still exists
- `packages/models` public exports expose `Instrument`

**Step 2: Run the model typecheck**

Run:

```bash
pnpm -C packages/models tsc
```

Expected:

- failures now come from actual model code, not missing `@blibliki/instrument` declarations

**Step 3: Fix package/model integration**

Make sure:

- `packages/models` resolves `@blibliki/instrument` cleanly
- `Instrument` follows the same persistence conventions as `Patch`
- the public exports in `packages/models/src/index.ts` are correct
- `Device` keeps backward compatibility by preferring `instrumentId` without removing `patchId`

**Step 4: Build and verify**

Run:

```bash
pnpm -C packages/models build
pnpm -C packages/models tsc
pnpm -C packages/models lint
```

Expected:

- `dist/index.d.ts` exists
- models typecheck passes
- lint passes

**Step 5: Commit**

```bash
git add packages/models
git commit -m "feat: add instrument persistence models"
```

## Task 3: Repair Grid Instrument Integration

**Files:**
- Modify: `apps/grid/src/routes/instrument.$instrumentId.tsx`
- Modify: `apps/grid/src/components/Instrument/index.tsx`
- Modify: `apps/grid/src/components/layout/Header/index.tsx`
- Modify: `apps/grid/src/components/Devices/DeviceModal.tsx`
- Modify: `apps/grid/src/components/Devices/index.tsx`
- Modify: `apps/grid/src/hooks/index.ts`
- Modify: `apps/grid/src/routeTree.gen.ts` if route generation requires it
- Test: `apps/grid/test/patch/instrumentModelBuild.test.ts`
- Reference: `apps/grid/src/routes/patch.$patchId.tsx`
- Reference: `apps/grid/src/hooks/index.ts`

**Step 1: Write or tighten failing Grid tests**

At minimum cover:

- creating a default Instrument document
- saving/loading an Instrument model
- editing focused track/page slot values
- editing sequencer page/step data
- invalid document does not compile or save

Keep tests narrow and model-driven where possible. Avoid broad UI snapshot tests in the first pass.

**Step 2: Run targeted Grid tests and typecheck**

Run:

```bash
pnpm -C apps/grid test test/patch/instrumentModelBuild.test.ts
pnpm -C apps/grid tsc
```

Expected:

- real failures in the new Grid integration

**Step 3: Fix package typing first**

If Grid reports missing declarations for `@blibliki/models` or `@blibliki/instrument`, do not add fake `declare module` shims. Fix the upstream package build/output chain instead.

If needed, rebuild packages before rerunning Grid:

```bash
pnpm build:packages
```

**Step 4: Fix `InstrumentEditor` component typing and state flow**

Repair:

- implicit `any` callbacks
- compiler result typing
- binding lookup logic
- focused track/page state
- sequencer editing state
- save/delete flow

Keep the UI intentionally minimal:

- patch name
- track name
- note source
- MIDI channel
- source profile
- FX selections
- globals
- page slots
- sequencer step/page editor

Do not add graph editing or deep modulation UI.

**Step 5: Fix device-assignment flow**

Ensure `DeviceModal` and the device list can:

- assign a `instrumentId`
- preserve legacy `patchId`
- show Instrument assignment clearly

**Step 6: Verify route integration**

Make sure `/instrument/$instrumentId` is reachable and linked from the header.

**Step 7: Re-run targeted checks**

Run:

```bash
pnpm -C apps/grid test test/patch/instrumentModelBuild.test.ts
pnpm -C apps/grid tsc
pnpm -C apps/grid lint
```

Expected:

- targeted tests pass
- Grid typecheck passes
- Grid lint passes

**Step 8: Commit**

```bash
git add apps/grid
git commit -m "feat: add grid instrument authoring flow"
```

## Task 4: Repair Pi Runtime Integration

**Files:**
- Modify: `packages/pi/src/index.ts`
- Modify: `packages/pi/src/runtime/PiSession.ts`
- Modify: `packages/pi/src/runtime/PiLaunchControlXL3.ts`
- Modify: `packages/pi/src/runtime/DisplayBridge.ts`
- Modify: `packages/pi/src/runtime/PiDisplayState.ts`
- Modify: `packages/pi/src/displayChild.ts`
- Modify: `packages/pi/package.json`
- Modify: `packages/pi/tsup.config.ts`
- Reference: `packages/pi/src/api.ts`
- Reference: `packages/pi/src/config.ts`
- Reference: `packages/engine/src/core/ControllerMatcherRegistry.ts`
- Reference: `packages/engine/src/modules/VirtualMidi.ts`
- Reference: `packages/engine/src/modules/StepSequencer.ts`

**Step 1: Write a failing runtime-focused test or smoke harness**

If `packages/pi` has no test harness yet, add a narrow smoke test or a typed runtime fixture around:

- `instrumentId` precedence over `patchId`
- display snapshot generation
- focused track/page state
- seq-edit mode toggle
- external MIDI channel routing

If full runtime tests are too heavy for the first pass, make the first safety net a narrow pure-logic test around session state transitions.

**Step 2: Run package typecheck**

Run:

```bash
pnpm -C packages/pi tsc
```

Expected:

- failures now come from the new runtime code only

**Step 3: Repair public imports**

The runtime currently imports symbols that are not exported from `@blibliki/engine`.

Decide one of these paths and apply it consistently:

- widen engine public exports for symbols that genuinely belong there
- or import those symbols from narrower engine paths only inside `packages/pi`

Do not leave broken public-root imports in place.

**Step 4: Repair the display bridge**

Make `DisplayBridge` type-safe and intentionally minimal.

Prototype contract:

- spawn an external display binary if `BLIBLIKI_PI_DISPLAY_BIN` exists
- otherwise spawn the built-in `displayChild`
- send newline-delimited JSON snapshots over stdin

The child-process typing should match the actual stdio configuration. Do not force `ChildProcessWithoutNullStreams` if stdout/stderr are intentionally null.

**Step 5: Repair `PiSession`**

Make `PiSession` the owner of:

- focused track
- active page
- seq-edit mode
- selected sequencer page
- selected step
- control application through semantic bindings

Prototype controller rules to implement:

- row 1 = globals in normal mode
- rows 2 and 3 = focused track page blocks in normal mode
- `Shift + Page Next` toggles seq edit
- seq edit temporarily repurposes all three encoder rows
- 16 channel buttons select sequencer steps and drive LED states
- faders always map to final track gain
- external MIDI routes by track MIDI channel, not by active track

Do not add extra button languages beyond what the design doc already settled.

Important prototype constraint:

- keep all `8` final track gains present while the fader layer is fixed one-to-one
- defer the optimization where `sourceProfileId: "unassigned"` makes a track truly compiler-disabled and skips source/fx/amp/filter initialization
- revisit that optimization only after the mixer/fader contract supports sparse or disabled tracks explicitly

**Step 6: Repair engine boot path**

In `packages/pi/src/index.ts`:

- prefer `device.instrumentId`
- fall back to legacy `patchId`
- compile the Instrument document locally
- initialize engine
- add compiled modules/routes
- start session/controller/display

Keep fallback/error handling minimal. Do not build a full boot UI yet.

**Step 7: Re-run package checks**

Run:

```bash
pnpm -C packages/pi tsc
pnpm -C packages/pi lint
```

If the Pi runtime depends on engine changes, rebuild packages:

```bash
pnpm build:packages
```

**Step 8: Commit**

```bash
git add packages/pi packages/engine
git commit -m "feat: add pi runtime compiler and controller integration"
```

## Task 5: Add Minimal Display Contract Documentation

**Files:**
- Modify: `docs/plans/2026-03-11-blibliki-pi-one-step-further-design.md`
- Optionally create: `docs/plans/2026-03-16-blibliki-pi-display-protocol.md`

**Step 1: Document the prototype display contract**

Capture:

- child-process protocol is newline-delimited JSON
- snapshot includes header, global band, upper band, lower band, seq-edit state
- `Rust + Slint + LinuxKMS` remains a spike target, not a fully implemented stack

**Step 2: Keep scope honest**

State explicitly that the current prototype uses a mock display child until the Rust display process is spiked for real.

**Step 3: Commit**

```bash
git add docs/plans
git commit -m "docs: document pi display prototype contract"
```

## Task 6: Full Verification

**Files:**
- No new files

**Step 1: Rebuild shared packages**

Run:

```bash
pnpm build:packages
```

Expected:

- packages build cleanly

**Step 2: Run repo verification**

Run:

```bash
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

Expected:

- all commands pass

If any command fails:

- stop
- fix only the failing surface
- rerun the same command before moving on

**Step 3: Manual smoke test**

Validate this path manually:

1. Create a Instrument in Grid
2. Save it
3. Assign it to a device
4. Start `packages/pi`
5. Confirm it prefers `instrumentId`
6. Confirm the engine loads compiled modules/routes
7. Confirm Launch Control XL3 input changes session state
8. Confirm display snapshots update

Do not skip the manual path just because automated checks passed.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete blibliki pi prototype vertical slice"
```

## Notes On Current Partial Work

The current prototype branch already contains useful scaffolding, but these are the known likely trouble spots to inspect first:

- `packages/instrument/src/compiler.ts`
  - wrong or mixed semantic binding keys
  - imports that are not actually exported by `@blibliki/engine`
  - likely prop-name drift against real engine module schemas
- `packages/instrument/src/defaults.ts`
  - `Division` vs `Resolution` mismatch
  - effect slot targets probably need disambiguation by FX slot index or position
- `apps/grid/src/components/Instrument/index.tsx`
  - many implicit `any` callbacks
  - binding lookup logic depends on whichever target contract you finalize
- `packages/pi/src/runtime/PiSession.ts`
  - engine imports not all public
  - display/session logic is ahead of the compiler contract
  - some session controls may not yet map to real engine props
- `packages/pi/src/runtime/DisplayBridge.ts`
  - child-process typing mismatch with actual stdio configuration

Treat these as checkpoints, not as a bug list to patch blindly. Fix the root contract first, then repair downstream surfaces.

## Suggested Commit Cadence

Use small commits after each task:

1. shared package
2. models
3. Grid authoring
4. Pi runtime
5. docs/protocol
6. final verification

## Final Reminder

This prototype is successful when the document/compiler/controller/display path is coherent and demonstrable. It is **not** successful because every future v1 detail is already implemented.
