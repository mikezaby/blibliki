# @blibliki/ui

Foundational UI package for Blibliki applications.

## Goals

- Provide reusable UI primitives with a consistent API.
- Enforce UI governance rules (class bloat + palette discipline).
- Provide an opinionated themeable UI system with simple app integration.

## Included in bootstrap

- `cn(...)` utility (`clsx` + `tailwind-merge`)
- `Button` component (`color`, `variant`, `size`, `asChild`)
- `UIProvider` + `createTheme(...)` for runtime theme customization
- Shared UI governance ESLint plugin/config
- Shared palette tokens (`tokens.css`) and component styles (`styles.css`)
- CSS palette checker script

## Governance usage in an app

```js
import { createUIGovernanceConfig } from "@blibliki/ui/eslint";
import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";

export default defineConfig([baseConfig, createUIGovernanceConfig()]);
```

## Quick start

Import styles once:

```css
@import "@blibliki/ui/styles.css";
```

No Tailwind `@source` wiring is required in consuming apps.

Render with provider:

```tsx
import { Button, UIProvider } from "@blibliki/ui";

export function Example() {
  return (
    <UIProvider mode="dark">
      <Button color="secondary" variant="contained">
        Save
      </Button>
    </UIProvider>
  );
}
```

Dark mode is handled via `mode="light" | "dark"` and corresponding CSS variables.

Button API:

- `color`: `primary | secondary | error | warning | info | success`
- `variant`: `contained | outlined | text`
- `size`: `md | sm | lg | icon`

## Theme customization

```tsx
import { UIProvider, createTheme } from "@blibliki/ui";

const theme = createTheme({
  light: {
    primary500: "oklch(0.72 0.18 185)",
    primary600: "oklch(0.66 0.19 185)",
    success500: "oklch(0.7 0.18 155)",
  },
  dark: {
    surface0: "oklch(0.09 0.01 260)",
    surface1: "oklch(0.13 0.01 260)",
  },
  radius: {
    md: "10px",
  },
});

export function ThemedApp() {
  return (
    <UIProvider mode="light" theme={theme}>
      {/* app */}
    </UIProvider>
  );
}
```
