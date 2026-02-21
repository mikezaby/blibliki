import { createTheme, type UIResolvedTheme } from "@blibliki/ui";
import { gridUITheme } from "./uiTheme";

export type GridThemePresetId = "slate" | "nord" | "solarized" | "one" | "mono";

type ThemePresetOption = {
  id: GridThemePresetId;
  label: string;
  description: string;
};

const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
};

const nordTheme = createTheme({
  light: {
    surface0: "var(--color-sky-50)",
    surface1: "var(--color-white)",
    surfaceRaised: "var(--color-white)",
    surfaceRaisedHover: "var(--color-sky-100)",
    surface2: "var(--color-sky-100)",
    borderSubtle: "var(--color-sky-200)",
    textPrimary: "var(--color-slate-900)",
    textSecondary: "var(--color-slate-700)",
    textMuted: "var(--color-slate-500)",

    primary500: "var(--color-blue-500)",
    primary600: "var(--color-blue-600)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-cyan-500)",
    secondary600: "var(--color-cyan-600)",
    secondaryContrast: "var(--color-white)",

    error500: "var(--color-red-500)",
    error600: "var(--color-red-600)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-amber-500)",
    warning600: "var(--color-amber-600)",
    warningContrast: "var(--color-slate-950)",

    info500: "var(--color-sky-500)",
    info600: "var(--color-sky-600)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-emerald-500)",
    success600: "var(--color-emerald-600)",
    successContrast: "var(--color-white)",
  },
  dark: {
    surface0: "var(--color-slate-950)",
    surface1: "var(--color-slate-900)",
    surfaceRaised: "var(--color-slate-800)",
    surfaceRaisedHover: "var(--color-slate-700)",
    surface2: "var(--color-slate-700)",
    borderSubtle: "var(--color-slate-600)",
    textPrimary: "var(--color-slate-100)",
    textSecondary: "var(--color-slate-300)",
    textMuted: "var(--color-slate-400)",

    primary500: "var(--color-blue-400)",
    primary600: "var(--color-blue-500)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-cyan-400)",
    secondary600: "var(--color-cyan-500)",
    secondaryContrast: "var(--color-white)",

    error500: "var(--color-red-400)",
    error600: "var(--color-red-500)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-amber-400)",
    warning600: "var(--color-amber-500)",
    warningContrast: "var(--color-slate-950)",

    info500: "var(--color-sky-400)",
    info600: "var(--color-sky-500)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-emerald-400)",
    success600: "var(--color-emerald-500)",
    successContrast: "var(--color-white)",
  },
  radius,
});

const solarizedTheme = createTheme({
  light: {
    surface0: "var(--color-amber-50)",
    surface1: "var(--color-amber-100)",
    surfaceRaised: "var(--color-white)",
    surfaceRaisedHover: "var(--color-amber-50)",
    surface2: "var(--color-amber-200)",
    borderSubtle: "var(--color-amber-300)",
    textPrimary: "var(--color-stone-900)",
    textSecondary: "var(--color-stone-700)",
    textMuted: "var(--color-stone-500)",

    primary500: "var(--color-cyan-600)",
    primary600: "var(--color-cyan-700)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-orange-500)",
    secondary600: "var(--color-orange-600)",
    secondaryContrast: "var(--color-white)",

    error500: "var(--color-red-500)",
    error600: "var(--color-red-600)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-amber-500)",
    warning600: "var(--color-amber-600)",
    warningContrast: "var(--color-stone-950)",

    info500: "var(--color-sky-500)",
    info600: "var(--color-sky-600)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-emerald-500)",
    success600: "var(--color-emerald-600)",
    successContrast: "var(--color-white)",
  },
  dark: {
    surface0: "var(--color-stone-950)",
    surface1: "var(--color-stone-900)",
    surfaceRaised: "var(--color-stone-800)",
    surfaceRaisedHover: "var(--color-stone-700)",
    surface2: "var(--color-stone-700)",
    borderSubtle: "var(--color-stone-600)",
    textPrimary: "var(--color-amber-50)",
    textSecondary: "var(--color-stone-300)",
    textMuted: "var(--color-stone-400)",

    primary500: "var(--color-cyan-400)",
    primary600: "var(--color-cyan-500)",
    primaryContrast: "var(--color-stone-950)",

    secondary500: "var(--color-orange-400)",
    secondary600: "var(--color-orange-500)",
    secondaryContrast: "var(--color-stone-950)",

    error500: "var(--color-red-400)",
    error600: "var(--color-red-500)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-amber-400)",
    warning600: "var(--color-amber-500)",
    warningContrast: "var(--color-stone-950)",

    info500: "var(--color-sky-400)",
    info600: "var(--color-sky-500)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-emerald-400)",
    success600: "var(--color-emerald-500)",
    successContrast: "var(--color-white)",
  },
  radius,
});

const oneTheme = createTheme({
  light: {
    surface0: "var(--color-zinc-100)",
    surface1: "var(--color-zinc-50)",
    surfaceRaised: "var(--color-white)",
    surfaceRaisedHover: "var(--color-zinc-100)",
    surface2: "var(--color-zinc-200)",
    borderSubtle: "var(--color-zinc-300)",
    textPrimary: "var(--color-zinc-900)",
    textSecondary: "var(--color-zinc-700)",
    textMuted: "var(--color-zinc-500)",

    primary500: "var(--color-blue-500)",
    primary600: "var(--color-blue-600)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-violet-500)",
    secondary600: "var(--color-violet-600)",
    secondaryContrast: "var(--color-white)",

    error500: "var(--color-rose-500)",
    error600: "var(--color-rose-600)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-amber-500)",
    warning600: "var(--color-amber-600)",
    warningContrast: "var(--color-zinc-950)",

    info500: "var(--color-cyan-500)",
    info600: "var(--color-cyan-600)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-emerald-500)",
    success600: "var(--color-emerald-600)",
    successContrast: "var(--color-white)",
  },
  dark: {
    surface0: "var(--color-zinc-950)",
    surface1: "var(--color-zinc-900)",
    surfaceRaised: "var(--color-zinc-800)",
    surfaceRaisedHover: "var(--color-zinc-700)",
    surface2: "var(--color-zinc-700)",
    borderSubtle: "var(--color-zinc-600)",
    textPrimary: "var(--color-zinc-100)",
    textSecondary: "var(--color-zinc-300)",
    textMuted: "var(--color-zinc-400)",

    primary500: "var(--color-blue-400)",
    primary600: "var(--color-blue-500)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-violet-400)",
    secondary600: "var(--color-violet-500)",
    secondaryContrast: "var(--color-white)",

    error500: "var(--color-rose-400)",
    error600: "var(--color-rose-500)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-amber-400)",
    warning600: "var(--color-amber-500)",
    warningContrast: "var(--color-zinc-950)",

    info500: "var(--color-cyan-400)",
    info600: "var(--color-cyan-500)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-emerald-400)",
    success600: "var(--color-emerald-500)",
    successContrast: "var(--color-white)",
  },
  radius,
});

const monoTheme = createTheme({
  light: {
    surface0: "var(--color-zinc-50)",
    surface1: "var(--color-white)",
    surfaceRaised: "var(--color-zinc-100)",
    surfaceRaisedHover: "var(--color-zinc-200)",
    surface2: "var(--color-zinc-300)",
    borderSubtle: "var(--color-zinc-400)",
    textPrimary: "var(--color-black)",
    textSecondary: "var(--color-zinc-900)",
    textMuted: "var(--color-zinc-700)",

    primary500: "var(--color-zinc-950)",
    primary600: "var(--color-zinc-900)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-zinc-500)",
    secondary600: "var(--color-zinc-600)",
    secondaryContrast: "var(--color-white)",

    error500: "var(--color-zinc-700)",
    error600: "var(--color-zinc-600)",
    errorContrast: "var(--color-white)",

    warning500: "var(--color-zinc-600)",
    warning600: "var(--color-zinc-500)",
    warningContrast: "var(--color-white)",

    info500: "var(--color-zinc-500)",
    info600: "var(--color-zinc-800)",
    infoContrast: "var(--color-white)",

    success500: "var(--color-zinc-300)",
    success600: "var(--color-zinc-200)",
    successContrast: "var(--color-zinc-950)",
  },
  dark: {
    surface0: "var(--color-black)",
    surface1: "var(--color-zinc-950)",
    surfaceRaised: "var(--color-zinc-900)",
    surfaceRaisedHover: "var(--color-zinc-800)",
    surface2: "var(--color-zinc-700)",
    borderSubtle: "var(--color-zinc-600)",
    textPrimary: "var(--color-white)",
    textSecondary: "var(--color-zinc-200)",
    textMuted: "var(--color-zinc-300)",

    primary500: "var(--color-zinc-100)",
    primary600: "var(--color-zinc-50)",
    primaryContrast: "var(--color-black)",

    secondary500: "var(--color-zinc-500)",
    secondary600: "var(--color-zinc-400)",
    secondaryContrast: "var(--color-zinc-950)",

    error500: "var(--color-zinc-500)",
    error600: "var(--color-zinc-400)",
    errorContrast: "var(--color-black)",

    warning500: "var(--color-zinc-600)",
    warning600: "var(--color-zinc-500)",
    warningContrast: "var(--color-black)",

    info500: "var(--color-zinc-500)",
    info600: "var(--color-zinc-400)",
    infoContrast: "var(--color-black)",

    success500: "var(--color-zinc-200)",
    success600: "var(--color-zinc-50)",
    successContrast: "var(--color-black)",
  },
  radius,
});

export const DEFAULT_GRID_THEME_PRESET: GridThemePresetId = "slate";

export const themePresets: Record<GridThemePresetId, UIResolvedTheme> = {
  slate: gridUITheme,
  nord: nordTheme,
  solarized: solarizedTheme,
  one: oneTheme,
  mono: monoTheme,
};

export const THEME_PRESET_OPTIONS: ThemePresetOption[] = [
  {
    id: "slate",
    label: "Slate",
    description: "Default neutral palette",
  },
  {
    id: "nord",
    label: "Nord",
    description: "Cool and calm blue-gray palette",
  },
  {
    id: "solarized",
    label: "Solarized",
    description: "Warm balanced palette for long sessions",
  },
  {
    id: "one",
    label: "One",
    description: "Modern contrast-focused palette",
  },
  {
    id: "mono",
    label: "Monochrome",
    description: "High-resolution grayscale with retro-tech contrast",
  },
];

export const isGridThemePresetId = (
  value: string | null | undefined,
): value is GridThemePresetId => {
  if (!value) return false;
  return value in themePresets;
};
