# @blibliki/ui

Foundational UI package for Blibliki applications.

## Goals

- Provide reusable UI primitives with a consistent API.
- Enforce UI governance rules (class bloat + palette discipline).
- Keep runtime styling lightweight (Tailwind + CSS variables).

## Included in bootstrap

- `cn(...)` utility (`clsx` + `tailwind-merge`)
- Shared UI governance ESLint plugin/config
- Shared palette tokens (`tokens.css`)
- CSS palette checker script

## Governance usage in an app

```js
import { createUIGovernanceConfig } from "@blibliki/ui/eslint";
import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";

export default defineConfig([baseConfig, createUIGovernanceConfig()]);
```

## Palette usage

Import once in your app styles:

```css
@import "@blibliki/ui/tokens.css";
```

Then reference variables:

```css
.example {
  color: var(--ui-color-text-primary);
  background: var(--ui-color-surface-1);
}
```
