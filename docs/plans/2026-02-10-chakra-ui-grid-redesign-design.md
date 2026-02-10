# Chakra UI Big-Bang Redesign for Grid App

**Date:** 2026-02-10  
**Status:** Design  
**Author:** Mike Zaby + Codex

## Overview

Redesign `apps/grid` by replacing the current Tailwind-first styling approach with a Chakra UI design system and a unified component architecture. This migration is a **big-bang cutover**: one dedicated branch, one final merge, and no Tailwind usage left in the app after completion.

This plan addresses current pain points:
- large components with mixed logic and long style strings
- inconsistent styling patterns between feature areas
- weak reuse for complex UI structures
- high friction when building or evolving complex components

## Decisions Locked

1. Migration mode: **Big bang**
2. Team policy: **Full freeze on `apps/grid` UI changes until merge**
3. Target: **Full redesign**, not visual parity
4. Tailwind policy: **Full removal** from `apps/grid`
5. Scope of done: **Entire `apps/grid` UI** (main patch screen, header, modals, devices page, auth states, error states)

## Goals

- Establish a standardized, reusable UI system based on Chakra UI.
- Remove ad-hoc, component-local styling patterns.
- Keep business logic and state flow stable while changing presentation architecture.
- Improve maintainability and speed of future UI work.

## Non-Goals

- Refactoring Redux/domain logic unless required for UI boundaries.
- Introducing a second styling system in parallel.
- Incremental rollout across multiple releases.

## Target Architecture

### 1. Theme and Tokens

Create `apps/grid/src/ui-system/theme/` as the single source of truth for:
- semantic color tokens
- typography scale and text styles
- spacing and sizing scale
- radii, borders, shadows, layer styles
- component recipes/variants (Button, Input, Card, Menu, Dialog, etc.)

Feature code must consume semantic tokens and approved variants only.

### 2. System Components

Create `apps/grid/src/ui-system/components/` for reusable primitives:
- `AppButton`, `AppInput`, `AppSelect`, `AppDialog`, `AppMenu`
- `Panel`, `FormField`, `StateMessage`, `IconAction`
- `AppCard`, `EmptyState`, `LoadingState`, `ErrorState`

Create `apps/grid/src/ui-system/layout/` for composition primitives:
- `AppShell`, `TopBar`, `PageContainer`, `SectionStack`
- `ModuleFrame`, `ControlRow`, `LabeledControl`

Feature folders (`AudioModule/*`, `Devices/*`, `layout/*`, `Modal/*`) must compose these primitives rather than carrying local style systems.

### 3. Provider Integration

Update `apps/grid/src/Providers/index.tsx` to include Chakra provider wiring while preserving:
- Redux provider
- Clerk provider
- ReactFlow provider
- existing engine/firebase initialization

Color mode moves to Chakra-native behavior. Remove root `.dark` class toggling and replace custom color-scheme plumbing with Chakra color-mode state.

### 4. Global CSS

After migration:
- remove Tailwind imports from `apps/grid/src/main.tsx`
- delete Tailwind style entry files in `apps/grid/src/styles/` that exist only for utility framework setup
- keep only minimal global CSS for non-Chakra-specific third-party needs (for example, specific ReactFlow path tweaks)

## Migration Plan

### Phase 1: Foundation

- Add Chakra dependencies and initial provider setup.
- Build base theme and core component recipes.
- Define app-level primitives in `ui-system`.
- No major feature rewrites yet; stabilize foundation first.

### Phase 2: Shell and Route Surfaces

- Migrate root shell (`routes/__root.tsx`) and top navigation/header.
- Migrate page-level containers and route surfaces (`index`, `devices`, patch route views).
- Migrate global surfaces: notification container, auth-facing states, router error UI.

### Phase 3: Feature Surface Migration

- Migrate grid canvas and module frame shells.
- Migrate AudioModule UI surfaces (including complex screens like `MidiMapper`, `Wavetable`, and StepSequencer editors).
- Migrate modals and device management views.
- Preserve existing behavior/state contracts while redesigning presentation.

### Phase 4: Removal and Hardening

- Remove Tailwind/shadcn dependencies and dead wrapper components.
- Remove obsolete style helpers and files.
- Run mandatory verification:
  - `pnpm tsc`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm format`

## Component Governance Rules

1. Feature components may contain logic/state; they may not define ad-hoc style systems.
2. Reusable style patterns must land in `ui-system` primitives or theme recipes.
3. Theme changes happen in one place (`ui-system/theme`), not inside feature folders.
4. New component variants require semantic naming and documentation in the theme layer.
5. Prefer composition of primitives over one-off wrapper proliferation.

## Risk Management

### Risk: Regression from simultaneous redesign + framework swap
- Mitigation: route-by-route QA checklist and screenshot baselines before merge.

### Risk: Inconsistent visual language during migration
- Mitigation: lock token palette, type scale, and core primitives before feature rewrites.

### Risk: Performance regressions in heavy module views
- Mitigation: preserve memoization boundaries and stable prop patterns while rewriting presentation.

### Risk: Branch drift despite freeze
- Mitigation: enforce freeze policy and permit only critical, approved exceptions.

## Verification Strategy

### Automated

- Keep existing checks as merge gates:
  - `pnpm tsc`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm format`

### Manual

Validate all routes and states:
- signed-in and signed-out header states
- devices empty/loading/list/edit/delete flows
- patch workflow (transport controls, module editing, modal interactions)
- error boundaries and route error screens
- ReactFlow interactions (drag/connect/select)

## Definition of Done

Migration is complete only when all are true:
1. No Tailwind utility classes in `apps/grid/src/**/*.tsx`
2. No active imports from legacy `@/components/ui` wrappers tied to Tailwind/shadcn style layer
3. No root `.dark` class theme mechanism
4. All required verification commands pass
5. Full app scope redesigned and reviewed (header, grid, modules, modals, devices, auth/error states)

