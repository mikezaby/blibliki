---
name: blibliki-ui
description: Use when working with Blibliki's packages/ui or migrating apps to @blibliki/ui, including component primitive changes, token/theme updates, semantic helper changes, styles.css/tokens.css updates, UI governance lint rules, Storybook sync, and adoption/debugging in apps like grid.
---

# Blibliki UI

## Overview

`@blibliki/ui` is the shared UI primitives and theming package for Blibliki apps. Treat package changes as contract changes: when public behavior moves, update Storybook and keep this skill aligned in the same task.

## Mandatory Rules

1. **Storybook sync is required for public UI changes.**
   - When you add, remove, or change public component behavior in `packages/ui`, update stories in `apps/storybook/src/stories/` in the same task.
   - Always run:
     - `pnpm -C apps/storybook lint`
     - `pnpm -C apps/storybook build-storybook`

2. **Skill sync is required for package/ui workflow changes.**
   - When `packages/ui` workflows, public APIs, or quality gates change, update `~/.codex/skills/blibliki-ui/SKILL.md` in the same task.
   - Validate after updates:
     - `python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py ~/.codex/skills/blibliki-ui`

## High-Signal File Map

- Public exports: `packages/ui/src/index.ts`
- Primitives: `packages/ui/src/components/*.tsx`
- Theme + provider: `packages/ui/src/theme.ts`, `packages/ui/src/UIProvider.tsx`
- Semantic helpers: `packages/ui/src/semantic.ts`
- Shared styles/tokens: `packages/ui/styles.css`, `packages/ui/tokens.css`
- UI governance lint: `packages/ui/eslint/ui-governance-plugin.js`, `packages/ui/eslint/index.js`
- Package rules: `packages/ui/CLAUDE.md`, `packages/ui/README.md`

## Core Workflows

### 1) Add or change a UI primitive

1. Modify or add component in `packages/ui/src/components/`.
2. Export it from `packages/ui/src/index.ts`.
3. If behavior is public, add/update Storybook stories.
4. Run validation commands (package + storybook).

### 2) Change tokens/theme/semantic behavior

1. Update the source of truth:
   - `packages/ui/tokens.css` for foundational palette tokens.
   - `packages/ui/src/theme.ts` for typed theme runtime shape.
   - `packages/ui/src/semantic.ts` for semantic helpers (`uiTone`, `uiColorMix`, `uiVars`).
   - `packages/ui/styles.css` for component styling.
2. Keep semantic intent usage consistent (`primary`, `secondary`, `error`, etc.).
3. Run `pnpm -C packages/ui run lint` (includes `lint:palette`).

### 3) Update UI governance lint rules

1. Edit `packages/ui/eslint/ui-governance-plugin.js` and/or `packages/ui/eslint/index.js`.
2. Confirm package lint passes.
3. If rules affect consuming apps, update app lint config/docs in the same task.

### 4) Migrate a consuming app (for example `apps/grid`)

1. Ensure app imports `@blibliki/ui/styles.css`.
2. Ensure app uses `UIProvider` (and app theme, if needed).
3. Replace raw/native UI with `@blibliki/ui` primitives where practical.
4. Keep app-level migration tests in place (for grid, see `apps/grid/test/ui/`).

## Verification Commands

Run this minimum set for `packages/ui` changes:

```bash
pnpm -C packages/ui run tsc
pnpm -C packages/ui run lint
pnpm -C packages/ui run build
pnpm -C apps/storybook lint
pnpm -C apps/storybook build-storybook
```

If requested (or before merge), also run repo-level checks:

```bash
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

## Common Mistakes

| Mistake                                           | Fix                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Changed a public primitive but skipped stories    | Update stories in `apps/storybook/src/stories/` and run Storybook checks |
| Added component but forgot to export it           | Export from `packages/ui/src/index.ts`                                   |
| Introduced raw color literals in package CSS      | Run `pnpm -C packages/ui run lint` and fix palette violations            |
| Updated package workflows but forgot skill update | Update `~/.codex/skills/blibliki-ui/SKILL.md` and run quick validation   |
| Consuming app looks wrong after migration         | Verify `@blibliki/ui/styles.css` import and `UIProvider` wiring          |

## Quick Resume Pointers

- For current grid migration status, start from:
  - `docs/plans/2026-02-21-grid-ui-migration-status.md`
- For package-level required policy, check:
  - `packages/ui/CLAUDE.md`
