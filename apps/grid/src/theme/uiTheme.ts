import { createTheme } from "@blibliki/ui";

export const gridUITheme = createTheme({
  light: {
    surface0: "var(--color-slate-100)",
    surface1: "var(--color-slate-50)",
    surfaceRaised: "var(--color-white)",
    surfaceRaisedHover: "var(--color-slate-100)",
    surface2: "var(--color-slate-200)",
    borderSubtle: "var(--color-slate-300)",
    textPrimary: "var(--color-slate-900)",
    textSecondary: "var(--color-slate-600)",
    textMuted: "var(--color-slate-500)",

    primary500: "var(--color-blue-500)",
    primary600: "var(--color-blue-600)",
    primaryContrast: "var(--color-white)",

    secondary500: "var(--color-purple-500)",
    secondary600: "var(--color-purple-600)",
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

    success500: "var(--color-green-500)",
    success600: "var(--color-green-600)",
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

    secondary500: "var(--color-purple-400)",
    secondary600: "var(--color-purple-500)",
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

    success500: "var(--color-green-400)",
    success600: "var(--color-green-500)",
    successContrast: "var(--color-white)",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
  },
});
