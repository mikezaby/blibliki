# @blibliki/ui

Foundational UI package for Blibliki applications.

## Goals

- Provide reusable UI primitives with a consistent API.
- Enforce UI governance rules (class bloat + palette discipline).
- Provide an opinionated themeable UI system with simple app integration.

## Included in bootstrap

- `cn(...)` utility (`clsx` + `tailwind-merge`)
- `Button` component (`variant`, `size`, `asChild`)
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
      <Button variant="secondary">Save</Button>
    </UIProvider>
  );
}
```

Dark mode is handled via `mode="light" | "dark"` and corresponding CSS variables.

## Theme customization

```tsx
import { UIProvider, createTheme } from "@blibliki/ui";

const theme = createTheme({
  light: {
    accent500: "oklch(0.72 0.18 185)",
    accent400: "oklch(0.79 0.14 185)",
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
