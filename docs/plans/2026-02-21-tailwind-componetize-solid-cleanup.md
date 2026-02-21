# Tailwind Componetize Solid Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `tailwind-componetize` merge-safe by enforcing grid test execution, enabling UI governance lint in grid, and wiring Storybook checks into the default quality gate.

**Architecture:** Keep app behavior unchanged and focus on guardrails. Add missing workspace scripts and lint config wiring first, then fix surfaced governance violations in small refactors, then enforce Storybook checks at workspace level. This sequence reduces risk and keeps each change verifiable.

**Tech Stack:** pnpm workspaces, React 19, TypeScript, Vitest, ESLint (flat config), Storybook 10, `@blibliki/ui`.

### Task 1: Ensure grid tests run in default workspace test gate

**Files:**
- Modify: `apps/grid/package.json`
- Test: `apps/grid/test/ui/gridThemeContrast.test.ts`

**Step 1: Write the failing test**

Confirm no `test` script exists yet (failure condition is missing workspace test participation).

Run: `cat apps/grid/package.json`
Expected: No `"test"` key in `scripts`.

**Step 2: Run test gate to verify current gap**

Run: `pnpm test`
Expected: Grid tests are not executed because `apps/grid` has no `test` script.

**Step 3: Write minimal implementation**

Add scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest run test/ui"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid run test`
Expected: Grid Vitest suite passes.

Run: `pnpm test`
Expected: Grid tests are now included in workspace test output.

**Step 5: Commit**

```bash
git add apps/grid/package.json
git commit -m "chore(grid): include grid tests in workspace test gate"
```

### Task 2: Enable shared UI governance lint rules in grid

**Files:**
- Modify: `apps/grid/eslint.config.js`
- Reference: `packages/ui/eslint/index.js`
- Test: `apps/grid/src/components/AudioModule/Wavetable/index.tsx`
- Test: `apps/grid/src/components/AudioModule/MidiMapper.tsx`
- Test: `apps/grid/src/components/AudioModule/StepSequencer/StepEditor.tsx`

**Step 1: Write the failing test**

Run lint on grid after enabling config (expected to fail initially due existing violations).

Run: `pnpm -C apps/grid run lint`
Expected: Failing rules once governance config is wired.

**Step 2: Run test to verify it fails**

Wire config first, then run:

Run: `pnpm -C apps/grid run lint`
Expected: `ui-governance/max-tailwind-classes` and/or `ui-governance/no-raw-color-values` violations reported.

**Step 3: Write minimal implementation**

Update `apps/grid/eslint.config.js`:

```js
import { createUIGovernanceConfig } from "@blibliki/ui/eslint";
```

Add governance config with an explicit threshold:

```js
createUIGovernanceConfig({ maxClasses: 14, severity: "error" })
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid run lint`
Expected: Passes after follow-up refactors in Task 3.

**Step 5: Commit**

```bash
git add apps/grid/eslint.config.js
git commit -m "chore(grid): enable shared ui governance lint rules"
```

### Task 3: Fix governance violations in high-density components

**Files:**
- Modify: `apps/grid/src/components/AudioModule/Wavetable/index.tsx`
- Modify: `apps/grid/src/components/AudioModule/MidiMapper.tsx`
- Modify: `apps/grid/src/components/AudioModule/StepSequencer/StepEditor.tsx`
- Optional helper: `apps/grid/src/lib/utils.ts`

**Step 1: Write the failing test**

Run lint and capture first failing file/rule.

Run: `pnpm -C apps/grid run lint`
Expected: Specific governance failures with file and line references.

**Step 2: Run test to verify it fails**

Re-run lint after each local edit to keep one-file scope.

Run: `pnpm -C apps/grid run lint`
Expected: File fails before its refactor and passes after.

**Step 3: Write minimal implementation**

For each file, apply the smallest refactor:

```tsx
const sectionClass = "rounded-md border border-border-subtle bg-surface-subtle p-3";
```

Replace repeated long class strings with:
- local constants
- small presentational subcomponents
- existing `@blibliki/ui` primitives (`Surface`, `Stack`, `Text`, `Badge`, `Button`)

Do not change runtime behavior or visual semantics.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/grid run lint`
Expected: Zero governance rule violations.

Run: `pnpm -C apps/grid run test`
Expected: Grid tests still pass.

**Step 5: Commit**

```bash
git add apps/grid/src/components/AudioModule/Wavetable/index.tsx apps/grid/src/components/AudioModule/MidiMapper.tsx apps/grid/src/components/AudioModule/StepSequencer/StepEditor.tsx
git commit -m "refactor(grid): reduce class density in migration hotspots"
```

### Task 4: Enforce Storybook checks in quality gate

**Files:**
- Modify: `package.json`
- Modify: `apps/storybook/package.json` (only if script normalization needed)
- Modify: `CLAUDE.md` (if command list needs update)

**Step 1: Write the failing test**

Run a new aggregate command before adding it.

Run: `pnpm run storybook:check`
Expected: Command not found.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/storybook lint && pnpm -C apps/storybook build-storybook`
Expected: Baseline command works manually.

**Step 3: Write minimal implementation**

Add root script:

```json
{
  "scripts": {
    "storybook:check": "pnpm -C apps/storybook lint && pnpm -C apps/storybook build-storybook"
  }
}
```

Optionally add `verify:ui`:

```json
{
  "scripts": {
    "verify:ui": "pnpm -C packages/ui run tsc && pnpm -C packages/ui run lint && pnpm -C packages/ui run build && pnpm run storybook:check"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm run storybook:check`
Expected: Storybook lint and build succeed from root.

**Step 5: Commit**

```bash
git add package.json apps/storybook/package.json CLAUDE.md
git commit -m "chore: add storybook check to workspace quality gate"
```

### Task 5: Final verification and merge-readiness pass

**Files:**
- Verify: `apps/grid/src/theme/uiTheme.ts`
- Verify: `apps/grid/test/ui/gridThemeContrast.test.ts`
- Verify: all files changed in Tasks 1-4

**Step 1: Write the failing test**

No new failing test. This is verification-only.

**Step 2: Run verification commands**

Run in order:

```bash
pnpm -C apps/grid run tsc
pnpm -C apps/grid run lint
pnpm -C apps/grid run test
pnpm run storybook:check
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

Expected: all commands exit `0`.

**Step 3: Verify branch delta**

Run: `git status --short`
Expected: only intended files changed.

Run: `git diff --stat main...HEAD`
Expected: no unexpected new scope beyond cleanup tasks.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: finalize tailwind-componetize cleanup gates"
```

### Notes

- Follow `@superpowers:test-driven-development` for each code fix.
- Use `@superpowers:verification-before-completion` before reporting done.
- Keep commits small and sequential so rollback is easy.

