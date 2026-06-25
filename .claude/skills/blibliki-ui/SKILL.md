---
name: blibliki-ui
description: Use when working with Blibliki's packages/ui or migrating apps to @blibliki/ui, including component primitive changes, token/theme updates, semantic helper changes, styles.css/tokens.css updates, UI governance lint rules, Storybook sync, and adoption/debugging in apps like grid.
---

# Blibliki UI

## Overview

`@blibliki/ui` is the shared UI primitives and theming package for Blibliki apps (React 19+). It provides design-token-based components, a theme runtime, and a CSS-class-based styling layer (BEM-like `ui-*` class names, no Tailwind in the package itself).

**Treat package changes as contract changes**: when public behavior moves, update Storybook and this skill in the same task.

## File Map

| Purpose | Path |
|---------|------|
| Public exports | `packages/ui/src/index.ts` |
| Components | `packages/ui/src/components/*.tsx` |
| Theme runtime | `packages/ui/src/theme.ts` |
| Provider | `packages/ui/src/UIProvider.tsx` |
| Semantic helpers | `packages/ui/src/semantic.ts` |
| Foundation tokens (CSS vars) | `packages/ui/tokens.css` |
| Component styles | `packages/ui/styles.css` |
| Governance lint plugin | `packages/ui/eslint/ui-governance-plugin.js` |
| `cn` helper | `packages/ui/src/lib/cn.ts` (clsx + tailwind-merge) |

---

## Consuming an App — Setup

```tsx
import "@blibliki/ui/styles.css"; // in app entry, once
import { UIProvider } from "@blibliki/ui";

<UIProvider mode="dark" theme={appTheme}>
  <App />
</UIProvider>
```

`UIProvider` props: `mode?: "light" | "dark"`, `theme?: UITheme`, `className?: string`. It sets CSS variables via inline `style` and adds the `dark` class + `data-theme` attribute.

---

## Token System

### CSS Variables (from `tokens.css`)

**Surfaces:**
- `--ui-color-surface-0` — canvas (page background)
- `--ui-color-surface-raised` — cards, panels floating above canvas
- `--ui-color-surface-raised-hover` — hover state of raised surfaces
- `--ui-color-surface-1` — one step above canvas
- `--ui-color-surface-2` — subtle inset areas
- `--ui-color-border-subtle` — borders and dividers

**Text:**
- `--ui-color-text-primary` — body copy
- `--ui-color-text-secondary` — supporting text
- `--ui-color-text-muted` — placeholder, disabled copy

**Intent (each has -500, -600, -contrast):**
- `--ui-color-primary-*`
- `--ui-color-secondary-*`
- `--ui-color-error-*`
- `--ui-color-warning-*`
- `--ui-color-info-*`
- `--ui-color-success-*`

**Radius:**
- `--ui-radius-sm: 4px` / `--ui-radius-md: 8px` / `--ui-radius-lg: 12px`

Dark theme activates on `.dark` or `[data-theme="dark"]`.

### Theme Runtime (`theme.ts`)

```ts
import { createTheme } from "@blibliki/ui";

const appTheme = createTheme({
  light: { primary500: "oklch(0.62 0.19 200)" }, // partial overrides
  dark:  { surface0: "oklch(0.10 0.01 260)" },
  radius: { md: "6px" },
});

// For manual injection:
themeToCssVariables(resolvedTheme, "dark") // → Record<string, string>
```

`UIColorTokens` fields (camelCase counterparts to the CSS vars above):  
`surface0, surfaceRaised, surfaceRaisedHover, surface1, surface2, borderSubtle, textPrimary, textSecondary, textMuted, primary500/600/Contrast, secondary…, error…, warning…, info…, success…`

---

## Semantic Helpers (`semantic.ts`)

```ts
import { uiVars, uiTone, uiColorMix } from "@blibliki/ui";

// Semantic CSS var aliases (use in inline styles or CSS-in-JS)
uiVars.surface.canvas    // "var(--ui-color-surface-0)"
uiVars.surface.panel     // "var(--ui-color-surface-1)"
uiVars.surface.raised    // "var(--ui-color-surface-raised)"
uiVars.surface.subtle    // "var(--ui-color-surface-2)"
uiVars.text.primary      // "var(--ui-color-text-primary)"
uiVars.text.secondary
uiVars.text.muted
uiVars.border.subtle

// Intent tone lookup (returns var(...) string)
uiTone("primary")          // "var(--ui-color-primary-500)"
uiTone("error", "600")     // "var(--ui-color-error-600)"
uiTone("success", "contrast")

// Color blending
uiColorMix(uiTone("primary"), "transparent", 80)
// → "color-mix(in oklab, var(--ui-color-primary-500), transparent 80%)"
```

`UIIntentTone` = `"primary" | "secondary" | "success" | "warning" | "error" | "info"`  
`UIIntentToneLevel` = `"500" | "600" | "contrast"`

---

## Component API Reference

All components follow the same pattern:
- BEM-like CSS classes: `ui-button`, `ui-button--variant-contained`
- `className` prop merges via `cn()` (clsx + tailwind-merge)
- `asChild` prop (via Radix Slot) delegates rendering to child element

### `Button`
```tsx
<Button variant="contained" color="primary" size="md">Save</Button>
```
- `variant`: `contained` | `outlined` | `text`
- `color`: `primary` | `neutral` | `secondary` | `error` | `warning` | `info` | `success`
- `size`: `sm` | `md` | `lg` | `icon`
- `asChild?: boolean`

### `IconButton`
```tsx
<IconButton icon={<PlusIcon />} aria-label="Add" size="md" />
```
- `icon: ReactNode`, `aria-label: string` (required)
- `size`: `xs` | `sm` | `md`
- Inherits `variant`/`color` from Button (defaults: `text`/`secondary`)

### `Surface`
```tsx
<Surface tone="raised" border="subtle" radius="md" shadow="sm">...</Surface>
```
- `tone`: `canvas` | `panel` | `raised` | `subtle`
- `border`: `none` | `subtle`
- `radius`: `none` | `sm` | `md` | `lg`
- `shadow`: `none` | `sm` | `md` | `lg` | `xl`
- `intent`: `neutral` | `success` | `warning` | `error` | `info`

### `Stack`
```tsx
<Stack direction="row" gap={2} align="center" justify="between">...</Stack>
```
- `direction`: `row` | `column`
- `align`: `start` | `center` | `end` | `stretch` | `baseline`
- `justify`: `start` | `center` | `end` | `between` | `around` | `evenly`
- `gap`: `0` | `1` | `2` | `3` | `4` | `5` | `6`
- `wrap?: boolean`

### `Text`
```tsx
<Text tone="secondary" size="sm" weight="medium">Label</Text>
```
- `tone`: `primary` | `secondary` | `muted` | `success` | `warning` | `error` | `info`
- `size`: `xs` | `sm` | `md` | `lg`
- `weight`: `regular` | `medium` | `semibold`

### `Badge`
```tsx
<Badge tone="success" variant="soft" size="md">Active</Badge>
```
- `tone`: `neutral` | `primary` | `secondary` | `success` | `warning` | `error` | `info`
- `variant`: `soft` | `solid` | `outline`
- `size`: `sm` | `md`

### `Input`
```tsx
<Input size="md" placeholder="Search…" />
```
- `size`: `sm` | `md`
- All native `<input>` attrs except `size` (shadowed)

### `Textarea`
Same size variants as Input.

### `Switch`
```tsx
<Switch checked={val} onCheckedChange={setVal} color="primary" size="md" />
```
- `checked?: boolean`, `onCheckedChange?: (checked: boolean) => void`
- `color`: `primary` | `secondary` | `error` | `warning` | `info` | `success`
- `size`: `sm` | `md`

### `Divider`
```tsx
<Divider orientation="horizontal" tone="subtle" />
```
- `orientation`: `horizontal` | `vertical`
- `tone`: `subtle` | `strong`

### `Encoder` (rotary dial)
```tsx
<Encoder name="Gain" value={val} onChange={setVal} min={0} max={1} step={0.01} />
```
- `name: string`, `onChange: (value: number) => void`
- `value?`, `defaultValue?`, `min?` (0), `max?` (1), `step?` (0.01)
- `exp?: number` — exponential curve (e.g. 2 for frequency)
- `size?: "sm" | "md"`, `disabled?: boolean`
- `formatValue?: (value: number) => string`
- Full range in 80px vertical drag; Shift key = 8× finer
- Keyboard: arrows (±1 step), PageUp/Down (±10 steps), Home/End

### `Fader` (range slider)
```tsx
<Fader name="Volume" value={val} onChange={(sliderVal, calcVal) => …} />
```
- `name: string`, `onChange: (sliderValue, calculatedValue) => void`
- `value?`, `defaultValue?`, `min?` (0), `max?` (1), `step?` (0.01)
- `orientation?: "vertical" | "horizontal"` (default `vertical`)
- `exp?: number`
- `marks?: readonly { value: number; label: string }[]`
- `hideMarks?: boolean`

### `Select` / `OptionSelect`

**Raw Radix-based Select** (full control):
```tsx
<Select value={val} onValueChange={setVal}>
  <SelectTrigger size="md"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
  </SelectContent>
</Select>
```

**`OptionSelect`** (convenience wrapper, prefer this):
```tsx
<OptionSelect
  value={val}
  options={["a", "b", "c"]}  // or {name, value}[] or {id, name}[]
  label="Choose"
  onChange={setVal}
/>
```
`options` accepts: `string[]`, `number[]`, `{name, value}[]`, `{id, name}[]`.  
Auto-sizing trigger width from longest option.

### `Dialog` / `ContextMenu` / `DropdownMenu`
Thin wrappers over Radix primitives with `ui-*` classes applied. Use the named re-exports directly; structure mirrors Radix composition exactly.

```tsx
<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
    …
  </DialogContent>
</Dialog>
```

### `Card`
```tsx
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

### `Label`
```tsx
<Label htmlFor="input-id">Name</Label>
```

---

## CSS Naming Convention

All styling lives in `styles.css` using BEM-like `ui-*` classes:
- Block: `ui-button`
- Modifier: `ui-button--variant-contained`, `ui-button--color-primary`, `ui-button--size-md`
- Element: `ui-encoder__dial`, `ui-encoder__value`, `ui-fader__control`

**Never add raw color literals** (`#hex`, `rgb()`, `oklch()`) directly in component CSS — always reference `--ui-color-*` vars. The `lint:palette` script enforces this.

`UI_MAX_TAILWIND_CLASSES = 12` — exported constant; consuming apps should not pass more than 12 Tailwind classes to any single `className` prop (governance lint rule).

---

## Visual Language Rules

- Flat, minimal: use surface/border tokens for structure; shadows only for real elevation (menus, dialogs)
- Intent color for state/progress/selection/focus; keep inactive structure neutral
- No skeuomorphic effects: no gloss, bevels, metallic shading, glow
- Decorative gradients only for branding or data visualization
- Short functional motion: color/border transitions only; avoid bounce/scale/lift
- All styling derives from semantic tokens — no hard-coded light/dark assumptions

---

## Workflows

### Add or change a UI primitive
1. Add/edit file in `packages/ui/src/components/`
2. Export from `packages/ui/src/index.ts`
3. Add/update Storybook story in `apps/storybook/src/stories/` (see below)
4. Run verification commands

### Change tokens / theme / semantic behavior
1. `tokens.css` — foundational palette CSS vars
2. `theme.ts` — typed `UIColorTokens` / `UIRadiusTokens` shape + defaults
3. `semantic.ts` — `uiVars`, `uiTone`, `uiColorMix` helpers
4. `styles.css` — component styling layer
5. Run `pnpm -C packages/ui run lint` (includes `lint:palette`)

### Update governance lint rules
1. Edit `packages/ui/eslint/ui-governance-plugin.js` and/or `packages/ui/eslint/index.js`
2. Confirm `pnpm -C packages/ui run lint` passes
3. If rules affect consuming apps, update app lint config in the same task

### Migrate a consuming app (e.g. `apps/grid`)
1. Import `@blibliki/ui/styles.css` in app entry
2. Wrap with `<UIProvider mode="dark" theme={appTheme}>`
3. Replace raw UI with `@blibliki/ui` primitives
4. Check app-level migration tests in `apps/grid/test/ui/`

---

## Storybook Sync (required for public changes)

Every public component must have a story in `apps/storybook/src/stories/`.  
Required exports per story file: `Playground` + key state stories (Variants, Colors, Sizes, Disabled, etc.).

```bash
pnpm -C apps/storybook lint
pnpm -C apps/storybook build-storybook
```

---

## Verification Commands

```bash
# packages/ui
pnpm -C packages/ui run tsc
pnpm -C packages/ui run lint       # includes lint:palette
pnpm -C packages/ui run build

# Storybook (required for public primitive changes)
pnpm -C apps/storybook lint
pnpm -C apps/storybook build-storybook

# Repo-level (before merge)
pnpm tsc && pnpm lint && pnpm test && pnpm format
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Changed public primitive, skipped stories | Add/update `apps/storybook/src/stories/ComponentName.stories.tsx` |
| Added component, forgot to export | Add to `packages/ui/src/index.ts` |
| Raw color literal in CSS | Use `--ui-color-*` vars; `lint:palette` will catch it |
| Using `OptionSelect` with `{id, name}[]` — `onChange` gets `id` string | That's correct; `OptionSelect` normalizes `id` → `value` internally |
| `Encoder` value jumps when toggling Shift mid-drag | Drag state stores `sliderValue`, not `actualValue` — this is by design |
| `Fader` `onChange` signature forgotten | `(sliderValue: number, calculatedValue: number) => void` |
| `UIProvider` missing in app | Surfaces default to CSS var fallbacks from `tokens.css`; theme overrides won't apply |
| Dark mode not working | Check that `.dark` or `[data-theme="dark"]` is on UIProvider's wrapper div |
