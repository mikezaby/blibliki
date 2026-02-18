import { createTheme } from "@blibliki/ui";

const gridBaseSurfaceTokens = {
  surface0: "var(--background)",
  surface1: "var(--card)",
  surface2: "var(--muted)",
  borderSubtle: "var(--border)",
  textPrimary: "var(--foreground)",
  textSecondary: "var(--muted-foreground)",
  textMuted: "var(--muted-foreground)",
} as const;

export const gridUITheme = createTheme({
  light: {
    ...gridBaseSurfaceTokens,
    surfaceRaised: "var(--color-slate-50, var(--card))",
    surfaceRaisedHover: "var(--color-slate-100, var(--muted))",

    // Blue accent used heavily across Grid controls.
    primary500: "oklch(0.62 0.2 259)",
    primary600: "oklch(0.56 0.21 259)",
    primaryContrast: "oklch(0.985 0 0)",

    // Purple accent aligned with Grid gradient language.
    secondary500: "oklch(0.627 0.265 303.9)",
    secondary600: "oklch(0.57 0.275 303.9)",
    secondaryContrast: "oklch(0.985 0 0)",

    error500: "oklch(0.577 0.245 27.325)",
    error600: "oklch(0.53 0.24 27.325)",
    errorContrast: "oklch(0.985 0 0)",

    warning500: "oklch(0.769 0.188 70.08)",
    warning600: "oklch(0.71 0.19 70.08)",
    warningContrast: "oklch(0.21 0.006 285.885)",

    info500: "oklch(0.696 0.17 210)",
    info600: "oklch(0.64 0.17 210)",
    infoContrast: "oklch(0.985 0 0)",

    success500: "oklch(0.696 0.17 162.48)",
    success600: "oklch(0.63 0.18 162.48)",
    successContrast: "oklch(0.985 0 0)",
  },
  dark: {
    ...gridBaseSurfaceTokens,
    surfaceRaised: "var(--color-slate-800, var(--card))",
    surfaceRaisedHover: "var(--color-slate-700, var(--muted))",

    primary500: "oklch(0.66 0.21 259)",
    primary600: "oklch(0.6 0.22 259)",
    primaryContrast: "oklch(0.985 0 0)",

    secondary500: "oklch(0.68 0.24 303.9)",
    secondary600: "oklch(0.62 0.25 303.9)",
    secondaryContrast: "oklch(0.985 0 0)",

    error500: "oklch(0.704 0.191 22.216)",
    error600: "oklch(0.64 0.2 22.216)",
    errorContrast: "oklch(0.985 0 0)",

    warning500: "oklch(0.79 0.17 70.08)",
    warning600: "oklch(0.73 0.18 70.08)",
    warningContrast: "oklch(0.21 0.006 285.885)",

    info500: "oklch(0.72 0.16 210)",
    info600: "oklch(0.66 0.17 210)",
    infoContrast: "oklch(0.985 0 0)",

    success500: "oklch(0.73 0.16 162.48)",
    success600: "oklch(0.67 0.17 162.48)",
    successContrast: "oklch(0.985 0 0)",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
  },
});
