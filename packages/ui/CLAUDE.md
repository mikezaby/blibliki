# `@blibliki/ui` Working Rules

## Storybook Sync (required)

Whenever you add, remove, or change any public UI component behavior in `packages/ui`, you must update Storybook in `apps/storybook` in the same task.

This includes:

- New components
- New props
- New variants, sizes, or colors
- Visual behavior changes in `styles.css`
- Theme/token-related changes that affect component rendering

Minimum expectation:

1. Add or update story files in `apps/storybook/src/stories/`.
2. Ensure stories cover `Playground` plus key states (variants/sizes/colors/states).
3. Run:
   - `pnpm -C apps/storybook lint`
   - `pnpm -C apps/storybook build-storybook`

Do not consider a UI change complete until Storybook is updated and builds successfully, unless the user explicitly asks to skip it.
