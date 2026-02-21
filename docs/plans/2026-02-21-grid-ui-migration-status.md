# Grid `@blibliki/ui` Migration Status (Apps/Grid)

> **For Claude:** This is a handoff/status document, not a feature spec. Use it as the source of truth for current migration state before making further UI migration changes.

## Snapshot

- **Date:** 2026-02-21
- **Branch:** `tailwind-componetize`
- **Divergence vs `origin/staging`:** `0 behind / 12 ahead`
- **Goal:** finish migration of `apps/grid` from ad-hoc Tailwind/shadcn-era patterns to `@blibliki/ui` primitives and semantic tokens.

## What Is Already Done

### App-level `@blibliki/ui` integration

- `apps/grid/package.json` includes `@blibliki/ui` workspace dependency.
- `apps/grid/src/main.tsx` uses `UIProvider` and `themeToCssVariables`.
- `apps/grid/src/theme/uiTheme.ts` defines app theme via `createTheme`.
- `apps/grid/src/styles/index.css` imports `@blibliki/ui/styles.css`.

### Migration coverage (component imports)

- `apps/grid/src/components`: **46 / 59 `.tsx` files** import from `@blibliki/ui`.
- Remaining `.tsx` files without `@blibliki/ui` imports are mostly expected non-visual wrappers, state-agnostic files, or trivial/null components:
  - `apps/grid/src/components/AudioModule/Constant.tsx`
  - `apps/grid/src/components/AudioModule/Filter/index.tsx`
  - `apps/grid/src/components/AudioModule/Keyboard/Octave.tsx`
  - `apps/grid/src/components/AudioModule/Master.tsx`
  - `apps/grid/src/components/AudioModule/Noise.tsx`
  - `apps/grid/src/components/AudioModule/VoiceScheduler.tsx`
  - `apps/grid/src/components/AudioModule/index.tsx`
  - `apps/grid/src/components/ColorSchemeBlockingScript.tsx`
  - `apps/grid/src/components/ErrorBoundary/ErrorBoundary.tsx`
  - `apps/grid/src/components/ErrorBoundary/index.tsx`
  - `apps/grid/src/components/Notification/index.tsx`
  - `apps/grid/src/components/RouterErrorComponent/RouterErrorComponent.tsx`
  - `apps/grid/src/components/RouterErrorComponent/index.tsx`

### Governance tests currently in place

- `apps/grid/test/ui/devicesUseUiPrimitives.test.ts`
- `apps/grid/test/ui/modalNotificationNavigatorUseUiPrimitives.test.ts`
- `apps/grid/test/ui/noNativeTextareaInComponents.test.ts`
- `apps/grid/test/ui/noRawCssVarsInComponents.test.ts`

All four passed during this evaluation.

### Recent migration commits (current branch)

- `4bf6378` add `Surface` intent variants and migrate notifications to semantic intents
- `9f13e63` inline file menu export actions and remove dead wrappers
- `daf37e9` simplify file menu to direct UI dropdown actions
- `631602a` migrate headers to UI `Text` and add semantic contrast tokens
- `6d43996` audio node migration
- `d9dd83d` reduce Tailwind in audio module dialog
- `7c3f0f5` minimize Tailwind in wavetable
- `d79e5cb` use `@blibliki/ui` for keyboard
- `1c99437` remove inline styles from AudioModules/Inspector/StepGrid
- `707f203` add `Textarea`/`Text`/`Badge` primitives and migrate grid textareas

## What Is Still Open

### 1) Governance not fully centralized in ESLint

- `apps/grid/eslint.config.js` does **not** currently use `createUIGovernanceConfig` from `@blibliki/ui/eslint`.
- Governance is currently enforced mainly by focused tests (good, but incomplete).

### 2) Remaining high-complexity UI hotspots

These files still contain dense utility-class composition and are likely final migration cleanup targets:

- `apps/grid/src/components/AudioModule/Wavetable/index.tsx`
- `apps/grid/src/components/AudioModule/MidiMapper.tsx`
- `apps/grid/src/components/Devices/index.tsx`
- `apps/grid/src/components/layout/Header/FileMenu/LoadModal.tsx`
- `apps/grid/src/components/AudioModule/StepSequencer/StepEditor.tsx`

### 3) Keyboard CSS still uses hard-coded colors

- `apps/grid/src/styles/keyboard.css` still contains fixed black/white and shadow color literals.
- This may be acceptable for now, but it is a likely follow-up for semantic token alignment.

### 4) Local `cn` utility still exists in grid

- `apps/grid/src/lib/utils.ts` duplicates `cn` utility behavior.
- Some files import `cn` from `@/lib/utils` instead of `@blibliki/ui`.
- Low priority, but worth normalizing if consistency is the final migration goal.

## Recommended Next Tasks (in order)

1. **Wire shared UI governance ESLint config into grid**
   - Target: `apps/grid/eslint.config.js`
   - Use: `createUIGovernanceConfig()` from `@blibliki/ui/eslint`
   - Outcome: governance rules become default lint guardrails, not only tests.

2. **Finish hotspot simplification with primitives/composed components**
   - Targets:
     - `apps/grid/src/components/AudioModule/Wavetable/index.tsx`
     - `apps/grid/src/components/AudioModule/MidiMapper.tsx`
     - `apps/grid/src/components/Devices/index.tsx`
   - Outcome: reduce class density and repeated class fragments.

3. **Token-align keyboard styles (optional but likely next)**
   - Targets:
     - `apps/grid/src/components/AudioModule/Keyboard/Octave.tsx`
     - `apps/grid/src/styles/keyboard.css`
   - Outcome: dark/light behavior and palette consistency without hard-coded colors.

4. **Normalize `cn` imports (optional cleanup)**
   - Replace local `@/lib/utils` usage with `@blibliki/ui` `cn` where practical.

## Validation Commands

Use this set when continuing migration work:

```bash
pnpm -C apps/grid run tsc
pnpm -C apps/grid exec vitest run test/ui
pnpm -C apps/grid exec vitest run
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

## Validation Results (2026-02-21)

- `pnpm -C apps/grid run tsc` passed.
- `pnpm -C apps/grid exec vitest run test/ui` passed (`4` files, `6` tests).
- `pnpm -C apps/grid exec vitest run` passed (`9` files, `29` tests).
- `pnpm tsc` passed across workspaces.
- `pnpm lint` passed across workspaces.
- `pnpm test` passed across workspaces (`packages/engine` and `packages/transport` suites green).
- `pnpm format` completed; files reported unchanged.

## Resume Prompt Template (for next Claude session)

Use this as a starter prompt:

> Continue `apps/grid` migration to `@blibliki/ui` using `docs/plans/2026-02-21-grid-ui-migration-status.md` as source of truth. Start with wiring `createUIGovernanceConfig` into `apps/grid/eslint.config.js`, then reduce Tailwind class density in `AudioModule/Wavetable/index.tsx` and `AudioModule/MidiMapper.tsx`. Run full validation commands before finishing.
