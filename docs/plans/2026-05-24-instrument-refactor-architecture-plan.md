# Instrument Refactor Architecture Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `packages/instrument` into small, typed, maintainable architecture units that match Blibliki package conventions without changing public behavior.

**Architecture:** Keep the current public API stable while moving behavior into engine-style domain classes. Use `packages/engine` as the reference for class-owned invariants, typed registries, deterministic wiring, serialization boundaries, and tests that mirror concepts.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, `@blibliki/engine`, tsdown.

## Current Assessment

`packages/instrument` already has useful concepts: blocks, tracks, pages, slots, compiler, document, templates, profiles, and hardware. The strongest parts look like `engine`: `BaseBlock`, `BaseTrack`, `Track`, and `InstrumentDocumentModel` own clear domain behavior. The weaker parts switch to loose function files after compilation:

- `src/compiler/createInstrumentEnginePatch.ts`: option normalization, runtime ID creation, runtime module factories, route building, track runtime wiring, MIDI mapper setup, master chain creation, and final patch assembly.
- `src/runtime/sequencerEdit.ts`: Launch Control XL3 CC constants, relative value math, selectors, patch updates, LED sync, display state creation, page sync, and encoder event reduction.
- `src/runtime/instrumentControllerSession.ts`: live MIDI device selection, runtime state mutation, persistence confirmation flow, LED sync, engine updates, display callbacks, and event listener lifecycle.
- `src/runtime/instrumentRuntime.ts`: navigation normalization, active page/track resolution, MIDI mapper prop updates, display state creation, and navigation reducers.
- `src/index.ts`: large export surface without domain grouping.

The existing tests are valuable and should be preserved as characterization tests while moving behavior into named classes. The target is not merely smaller files; it is a class architecture where each class owns one concrete concept.

## Pipeline Contract

The refactor should make the package read as a clear pipeline. Each stage has one input, one output, and a narrow reason to change.

```text
1. Document
   InstrumentDocument, templates, hardware profile ids, track documents

2. Domain model
   Track, BaseTrack, BaseBlock, Page, Slot, block IO, track IO

3. Track compiler
   Track model -> compiled track pages, LaunchControl page summaries, track engine modules/routes

4. Instrument compiler
   Instrument document + compiled tracks -> compiled instrument, global MIDI mappings, runtime ids

5. Engine patch serializer
   Compiled instrument + runtime modules/routes -> IEngineSerialize

6. Instrument domain runtime
   Compiled runtime patch -> Instrument object with navigation, active track/page, display state inputs

7. Hardware surface/domain behavior
   Launch Control XL3 event -> instrument navigation/editing/display command

8. Session boundary
   Commands -> engine.updateModule, transport start/stop, LED sync, persistence callbacks, display callbacks

9. Hardware adapters
   LaunchControlXL3 CC/page maps, global rows, display protocol mapping
```

Strict direction rule:

```text
Document -> Model -> Compiler -> Serialized Patch -> Instrument -> InstrumentSession -> Hardware/App Side Effects
```

Earlier stages must not call later-stage side effects. For example:

- `compileInstrument` must not know about live MIDI devices.
- `createInstrumentEnginePatch` may create serialized `MidiInput` modules, but must not subscribe to input devices.
- `Instrument` may update navigation and create display state, but must not subscribe to MIDI devices.
- `InstrumentSession` may execute persistence and engine updates, but should not contain step mutation algorithms.

## Target Shape

Recommended folder shape after refactor:

```text
packages/instrument/src/
  Instrument.ts
  InstrumentSession.ts
  core/
    InstrumentNavigation.ts
    InstrumentDisplay.ts
    runtimeIds.ts
    runtimeRoutes.ts
    midiPortSelection.ts
  blocks/
    BaseBlock.ts
    registry.ts
    ...
  tracks/
    BaseTrack.ts
    runtimeMidi.ts
    ...
  compiler/
    createInstrumentEnginePatch.ts
    instrumentRuntimeModules.ts
    instrumentRuntimeRoutes.ts
    engineSerialization.ts
    compileInstrument.ts
    compileTrack.ts
  sequencer/
    InstrumentSequencerEdit.ts
    sequencerSteps.ts
  surfaces/
    launchControlXL3/
      LaunchControlXL3Surface.ts
      LaunchControlXL3Display.ts
      LaunchControlXL3SequencerEdit.ts
      launchControlXL3Controls.ts
      launchControlXL3Leds.ts
  hardware/
    launchControlXL3/
      pageMap.ts
      globalRow.ts
```

Do not move everything at once. Create compatibility exports where needed so imports can migrate gradually. Existing files under `runtime/` can temporarily re-export the new classes/functions, but they should stop being the architectural center.

## Ownership Rules

Use these rules when deciding where code belongs:

| Responsibility | Owner |
| --- | --- |
| Stable IDs and route IDs | `src/core/runtimeIds.ts`, `src/core/runtimeRoutes.ts` |
| MIDI port option defaults and normalization | `src/core/midiPortSelection.ts` |
| Block module/IO/slot registration | Concrete block classes |
| Block/track collection invariants and serialization | `BaseBlock`, `BaseTrack` |
| Track page and MIDI mapper compilation | `src/compiler/compileTrack.ts` and focused helpers |
| Instrument runtime module factories | `src/compiler/instrumentRuntimeModules.ts` |
| Instrument runtime route factories | `src/compiler/instrumentRuntimeRoutes.ts` |
| Conversion to `IEngineSerialize` | `src/compiler/engineSerialization.ts` |
| Instrument runtime state, active track/page, display state | `src/Instrument.ts` |
| Navigation invariants and wrapping | `src/core/InstrumentNavigation.ts` |
| MIDI mapper prop updates after navigation | `Instrument` method that serializes the updated engine patch |
| Live engine/device/persistence lifecycle | `src/InstrumentSession.ts` |
| Launch Control XL3 event interpretation | `src/surfaces/launchControlXL3/LaunchControlXL3Surface.ts` |
| Sequencer step editing algorithms | `src/sequencer/InstrumentSequencerEdit.ts` or `src/surfaces/launchControlXL3/LaunchControlXL3SequencerEdit.ts` |
| LED output and live engine calls | `InstrumentSession` and surface adapter classes only |
| Persistence confirmation and execution | `InstrumentSession` |

## Phase 1: Safety Baseline

**Files:**
- Read: `packages/instrument/src/**`
- Read: `packages/instrument/test/**`

**Steps:**

1. Run `pnpm -C packages/instrument test`.
2. Run `pnpm -C packages/instrument tsc`.
3. Capture any existing failures before refactoring.
4. Do not change behavior until the current test baseline is known.

**Commit:** none unless baseline documentation is changed.

## Phase 2: Extract Compiler Helpers

**Files:**
- Create: `packages/instrument/src/core/runtimeIds.ts`
- Create: `packages/instrument/src/core/runtimeRoutes.ts`
- Create: `packages/instrument/src/core/midiPortSelection.ts`
- Modify: `packages/instrument/src/compiler/createInstrumentEnginePatch.ts`
- Test: `packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts`

**Steps:**

1. Move runtime ID builders from `createInstrumentEnginePatch.ts` to `core/runtimeIds.ts`.
2. Move runtime route builders and expanded route helpers to `core/runtimeRoutes.ts`.
3. Move MIDI port selection defaults and normalization to `core/midiPortSelection.ts`.
4. Keep function names explicit: `createInstrumentRuntimeModuleId`, `createTrackRuntimeModuleId`, `createRuntimeRouteId`, `normalizePortSelection`, `excludeControllerFromAllNoteInputs`.
5. Run `pnpm -C packages/instrument test test/compiler/createInstrumentEnginePatch.test.ts`.
6. Run `pnpm -C packages/instrument tsc`.

**Expected result:** `createInstrumentEnginePatch.ts` no longer owns naming or option-normalization mechanics.

## Phase 3: Split Instrument Patch Assembly

**Files:**
- Create: `packages/instrument/src/compiler/instrumentRuntimeModules.ts`
- Create: `packages/instrument/src/compiler/instrumentRuntimeRoutes.ts`
- Create: `packages/instrument/src/compiler/engineSerialization.ts`
- Modify: `packages/instrument/src/compiler/createInstrumentEnginePatch.ts`
- Test: `packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts`

**Steps:**

1. Move runtime module factories into `instrumentRuntimeModules.ts`.
2. Move master, controller, and track note runtime route creation into `instrumentRuntimeRoutes.ts`.
3. Move `toEngineSerializableModule` into `engineSerialization.ts`.
4. Leave `createInstrumentEnginePatch.ts` as orchestration only: compile document, resolve runtime IDs/options, collect modules, collect routes, return patch.
5. Run the focused compiler tests after each extraction.

**Expected result:** `createInstrumentEnginePatch.ts` becomes a readable assembly function instead of a mixed compiler/runtime factory.

## Phase 4: Introduce Instrument Navigation Class

**Files:**
- Create: `packages/instrument/src/core/InstrumentNavigation.ts`
- Modify: `packages/instrument/src/runtime/instrumentRuntime.ts`
- Test: `packages/instrument/test/core/InstrumentNavigation.test.ts`
- Test: `packages/instrument/test/runtime/instrumentRuntime.test.ts`

**Steps:**

1. Write tests for `InstrumentNavigation.fromRuntimePatch(...)`, `navigate(...)`, `withChanges(...)`, and `serialize()`.
2. Move navigation wrapping, page fallback, mode validation, selected-step clamping, and active track/page resolution into `InstrumentNavigation`.
3. Keep `runtime/instrumentRuntime.ts` as a compatibility facade that delegates to the class.
4. Run focused navigation and runtime tests.

**Expected result:** navigation is a concrete domain object, not a loose set of runtime functions.

## Phase 5: Introduce Instrument Class

**Files:**
- Create: `packages/instrument/src/Instrument.ts`
- Modify: `packages/instrument/src/runtime/instrumentRuntime.ts`
- Modify: `packages/instrument/src/index.ts`
- Test: `packages/instrument/test/Instrument.test.ts`
- Test: `packages/instrument/test/runtime/instrumentRuntime.test.ts`

**Steps:**

1. Write tests for `Instrument.fromRuntimePatch(...)`, `runtimeState`, `displayState`, `navigate(...)`, and `serializeEnginePatch()`.
2. Move active track/page/visible page resolution into `Instrument`.
3. Move MIDI mapper prop synchronization into `Instrument.serializeEnginePatch()` or an explicit `Instrument.withNavigation(...)` method.
4. Keep existing public functions as compatibility wrappers around `Instrument`.
5. Run focused instrument and runtime tests.

**Expected result:** the compiled instrument has a central class equivalent in spirit to `Engine`: it owns runtime state and exposes clear methods.

## Phase 6: Introduce InstrumentSession Class

**Files:**
- Create: `packages/instrument/src/InstrumentSession.ts`
- Modify: `packages/instrument/src/runtime/instrumentControllerSession.ts`
- Modify: `packages/instrument/src/runtime/controllerRuntime.ts`
- Test: `packages/instrument/test/runtime/instrumentControllerSession.test.ts`, `packages/instrument/test/runtime/controllerRuntime.test.ts`

**Steps:**

1. Write tests around current session behavior before moving implementation.
2. Move live engine updates, MIDI device subscriptions, display callbacks, persistence callbacks, and disposal into `InstrumentSession`.
3. Keep `createInstrumentControllerSession` as a compatibility factory that creates an `InstrumentSession`.
4. Keep event interpretation outside the session where it belongs to `Instrument` or a hardware surface class.
5. Run controller runtime and session tests.

**Expected result:** live side effects are owned by one lifecycle class with clear start/update/dispose behavior.

## Phase 7: Introduce LaunchControlXL3 Surface Classes

**Files:**
- Create folder: `packages/instrument/src/surfaces/launchControlXL3/`
- Create: `LaunchControlXL3Surface.ts`
- Create: `LaunchControlXL3Display.ts`
- Create: `LaunchControlXL3SequencerEdit.ts`
- Create: `launchControlXL3Controls.ts`
- Create: `launchControlXL3Leds.ts`
- Modify: `packages/instrument/src/runtime/sequencerEdit.ts`
- Modify: `packages/instrument/src/runtime/controllerRuntime.ts`
- Test: existing runtime/controller tests; add focused surface tests as behavior is moved.

**Steps:**

1. Move Launch Control XL3 control constants and event classification into `launchControlXL3Controls.ts`.
2. Move display mapping into `LaunchControlXL3Display`.
3. Move sequencer edit interaction into `LaunchControlXL3SequencerEdit`.
4. Move LED message creation into `launchControlXL3Leds.ts`.
5. Keep old runtime exports as compatibility facades.
6. Run focused controller, session, and sequencer edit tests.

**Expected result:** hardware-specific behavior lives under a hardware surface concept instead of generic `runtime/controller` files.

## Phase 8: Introduce Typed Registries

**Files:**
- Create: `packages/instrument/src/blocks/registry.ts`
- Create: `packages/instrument/src/templates/registry.ts` if templates grow beyond default
- Create: `packages/instrument/src/profiles/registry.ts` if profiles grow beyond default
- Modify: block/template/profile exports as needed
- Test: existing block/compiler tests

**Steps:**

1. Add typed maps for block constructors and metadata where conditional creation currently spreads across factories.
2. Keep block classes small; constructors declare modules, IO, routes, and slots only.
3. Do not introduce a registry unless it removes real conditionals or repeated imports.

**Expected result:** adding a new block or profile follows a predictable path like adding an engine module.

## Phase 9: Export Surface Cleanup

**Files:**
- Modify: `packages/instrument/src/index.ts`
- Optional create: domain barrel files such as `blocks/index.ts`, `compiler/index.ts`, `runtime/index.ts`

**Steps:**

1. Group exports by domain in `src/index.ts`.
2. Prefer domain barrel files only if they reduce root export noise without hiding ownership.
3. Preserve existing public export names unless the user explicitly approves a breaking change.
4. Run downstream typecheck with `pnpm tsc`.

**Expected result:** users can understand the package API by reading grouped exports.

## Phase 10: Final Verification

Run from repo root:

```bash
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

If package-local checks are needed during the refactor, use:

```bash
pnpm -C packages/instrument tsc
pnpm -C packages/instrument lint
pnpm -C packages/instrument test
pnpm -C packages/instrument format
```

## Refactor Rules

- Preserve runtime IDs, route IDs, module IDs, public exports, and serialized patch shape unless a task explicitly changes them.
- Do not rewrite logic and move files in the same step when extraction alone is enough.
- Prefer named domain classes when there is state, navigation, active selection, lifecycle, collections, synchronization, or serialization to own.
- Use pure helper modules only for compiler steps, deterministic naming, serialization helpers, and tiny utilities with a clear context.
- Add base classes only when multiple implementations share invariants.
- Keep tests concept-named: no `RefactorBug.test.ts`, `VibeCleanup.test.ts`, or phase-named test files.
- Stop after each phase if tests reveal behavior that was not already covered.
