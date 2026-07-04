# Macro Props Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add four template-defined global macro encoders that can be enabled, named, mapped to numeric module props, moved from Launch Control XL3 global-row encoder slots, displayed, and saved.

**Architecture:** Macros are generic controller data, mounted into encoder slots by the owning controller scope. V1 stores global-row macros in `document.globalController`; Launch Control XL3 CCs 15-18 resolve to those slots. Macro movement is handled in the instrument session because one macro can fan out to multiple normal module prop updates.

**Tech Stack:** TypeScript, `packages/instrument`, React grid editor, Vitest, `@blibliki/engine` module schemas, Launch Control XL3 controller runtime.

## Baseline

Fresh worktrees need built workspace package entrypoints:

```bash
pnpm install
pnpm build:packages
pnpm test
```

## Tasks

### Task 1: Add Macro Document Types And Defaults

Add macro document types, four default global macros, global slot assignments, migration fallback for missing `globalController`, exports, and document tests.

Verification:

```bash
pnpm -C packages/instrument test test/document/defaultDocument.test.ts test/document/version.test.ts
pnpm -C packages/instrument tsc
```

### Task 2: Compile And Display Global Macro Slots

Carry `globalController` through `CompiledInstrument`, add Launch Control global-row slot ids for CC 15-18, and render macro names/value/inactive state in global display slots.

Verification:

```bash
pnpm -C packages/instrument test test/compiler/compileInstrument.test.ts test/display/LiveInstrumentDisplayState.test.ts
pnpm -C packages/instrument tsc
```

### Task 3: Add Macro Mapping Math

Add pure helpers for relative encoder value reduction and absolute macro mapping with schema fallback, `exp`, ordered ranges, and `inverted`.

Verification:

```bash
pnpm -C packages/instrument test test/macros/macroMapping.test.ts
pnpm -C packages/instrument tsc
```

### Task 4: Apply Macro Encoders In Controller Session

Extend the Launch Control surface/session so macro slot CCs update macro value, compute mapped target values, and call `engine.updateModule` for every target mapping.

Verification:

```bash
pnpm -C packages/instrument test test/surfaces/launchControlXL3/LaunchControlXL3Surface.test.ts test/InstrumentSession.test.ts
pnpm -C packages/instrument tsc
```

### Task 5: Save Macro Runtime State

Persist runtime macro controller state through `createSavedInstrumentDocument`, while target module props continue saving through existing module prop paths.

Verification:

```bash
pnpm -C packages/instrument test test/document/SavedInstrumentDocument.test.ts
pnpm -C packages/instrument tsc
```

### Task 6: Add Instrument Editor Macro Configuration

Render four global macro slots in the instrument editor with enabled switch, editable name, mapping controls, ordered ranges, and inversion switch.

Verification:

```bash
pnpm -C apps/grid test -- test/instruments/InstrumentEditor.test.tsx
pnpm -C apps/grid tsc
```

### Task 7: Final Verification

Run:

```bash
pnpm build:packages
pnpm tsc
pnpm lint
pnpm test
pnpm format
```
