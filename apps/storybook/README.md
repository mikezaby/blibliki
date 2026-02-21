# Storybook App

Standalone Storybook playground for Blibliki UI components.

## Run

```bash
pnpm -C apps/storybook storybook
```

## Build static Storybook

```bash
pnpm -C apps/storybook build-storybook
```

## First story

- `src/stories/Button.stories.tsx`
- Uses `@blibliki/ui` `Button`
- Supports light/dark preview toolbar

## Styling setup

- Import one file: `@blibliki/ui/styles.css`
- Themeable via `UIProvider` and `createTheme(...)`
- Storybook container styles in `src/stories/storybook.css`
