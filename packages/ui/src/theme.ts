export type UIMode = "light" | "dark";

export interface UIColorTokens {
  surface0: string;
  surfaceRaised: string;
  surfaceRaisedHover: string;
  surface1: string;
  surface2: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary500: string;
  primary600: string;
  primaryContrast: string;
  secondary500: string;
  secondary600: string;
  secondaryContrast: string;
  error500: string;
  error600: string;
  errorContrast: string;
  warning500: string;
  warning600: string;
  warningContrast: string;
  info500: string;
  info600: string;
  infoContrast: string;
  success500: string;
  success600: string;
  successContrast: string;
}

export interface UIRadiusTokens {
  sm: string;
  md: string;
  lg: string;
}

export interface UITheme {
  light?: Partial<UIColorTokens>;
  dark?: Partial<UIColorTokens>;
  radius?: Partial<UIRadiusTokens>;
}

export interface UIResolvedTheme {
  light: UIColorTokens;
  dark: UIColorTokens;
  radius: UIRadiusTokens;
}

const defaultLight: UIColorTokens = {
  surface0: "oklch(0.985 0.004 260)",
  surfaceRaised: "oklch(0.996 0.002 260)",
  surfaceRaisedHover: "oklch(1 0 0)",
  surface1: "oklch(0.96 0.006 260)",
  surface2: "oklch(0.92 0.008 260)",
  borderSubtle: "oklch(0.84 0.01 260)",
  textPrimary: "oklch(0.18 0.01 260)",
  textSecondary: "oklch(0.33 0.01 260)",
  textMuted: "oklch(0.48 0.01 260)",
  primary500: "oklch(0.62 0.19 255)",
  primary600: "oklch(0.55 0.2 255)",
  primaryContrast: "oklch(0.98 0 0)",
  secondary500: "oklch(0.62 0.2 300)",
  secondary600: "oklch(0.55 0.21 300)",
  secondaryContrast: "oklch(0.98 0 0)",
  error500: "oklch(0.63 0.24 28)",
  error600: "oklch(0.57 0.24 28)",
  errorContrast: "oklch(0.98 0 0)",
  warning500: "oklch(0.78 0.17 78)",
  warning600: "oklch(0.72 0.17 78)",
  warningContrast: "oklch(0.2 0.01 260)",
  info500: "oklch(0.66 0.14 220)",
  info600: "oklch(0.59 0.15 220)",
  infoContrast: "oklch(0.98 0 0)",
  success500: "oklch(0.66 0.17 150)",
  success600: "oklch(0.59 0.18 150)",
  successContrast: "oklch(0.98 0 0)",
};

const defaultDark: UIColorTokens = {
  surface0: "oklch(0.12 0.01 260)",
  surfaceRaised: "oklch(0.2 0.01 260)",
  surfaceRaisedHover: "oklch(0.24 0.01 260)",
  surface1: "oklch(0.16 0.01 260)",
  surface2: "oklch(0.21 0.01 260)",
  borderSubtle: "oklch(0.34 0.01 260)",
  textPrimary: "oklch(0.96 0.01 260)",
  textSecondary: "oklch(0.76 0.01 260)",
  textMuted: "oklch(0.62 0.01 260)",
  primary500: "oklch(0.67 0.19 255)",
  primary600: "oklch(0.6 0.2 255)",
  primaryContrast: "oklch(0.98 0 0)",
  secondary500: "oklch(0.67 0.2 300)",
  secondary600: "oklch(0.6 0.21 300)",
  secondaryContrast: "oklch(0.98 0 0)",
  error500: "oklch(0.67 0.22 28)",
  error600: "oklch(0.6 0.23 28)",
  errorContrast: "oklch(0.98 0 0)",
  warning500: "oklch(0.79 0.15 78)",
  warning600: "oklch(0.73 0.16 78)",
  warningContrast: "oklch(0.2 0.01 260)",
  info500: "oklch(0.69 0.13 220)",
  info600: "oklch(0.62 0.14 220)",
  infoContrast: "oklch(0.98 0 0)",
  success500: "oklch(0.69 0.16 150)",
  success600: "oklch(0.62 0.17 150)",
  successContrast: "oklch(0.98 0 0)",
};

const defaultRadius: UIRadiusTokens = {
  sm: "4px",
  md: "8px",
  lg: "12px",
};

export const createTheme = (theme: UITheme = {}): UIResolvedTheme => ({
  light: { ...defaultLight, ...theme.light },
  dark: { ...defaultDark, ...theme.dark },
  radius: { ...defaultRadius, ...theme.radius },
});

export function themeToCssVariables(
  theme: UIResolvedTheme,
  mode: UIMode,
): Record<string, string> {
  const colors = mode === "dark" ? theme.dark : theme.light;

  return {
    "--ui-color-surface-0": colors.surface0,
    "--ui-color-surface-raised": colors.surfaceRaised,
    "--ui-color-surface-raised-hover": colors.surfaceRaisedHover,
    "--ui-color-surface-1": colors.surface1,
    "--ui-color-surface-2": colors.surface2,
    "--ui-color-border-subtle": colors.borderSubtle,
    "--ui-color-text-primary": colors.textPrimary,
    "--ui-color-text-secondary": colors.textSecondary,
    "--ui-color-text-muted": colors.textMuted,
    "--ui-color-primary-500": colors.primary500,
    "--ui-color-primary-600": colors.primary600,
    "--ui-color-primary-contrast": colors.primaryContrast,
    "--ui-color-secondary-500": colors.secondary500,
    "--ui-color-secondary-600": colors.secondary600,
    "--ui-color-secondary-contrast": colors.secondaryContrast,
    "--ui-color-error-500": colors.error500,
    "--ui-color-error-600": colors.error600,
    "--ui-color-error-contrast": colors.errorContrast,
    "--ui-color-warning-500": colors.warning500,
    "--ui-color-warning-600": colors.warning600,
    "--ui-color-warning-contrast": colors.warningContrast,
    "--ui-color-info-500": colors.info500,
    "--ui-color-info-600": colors.info600,
    "--ui-color-info-contrast": colors.infoContrast,
    "--ui-color-success-500": colors.success500,
    "--ui-color-success-600": colors.success600,
    "--ui-color-success-contrast": colors.successContrast,
    "--ui-radius-sm": theme.radius.sm,
    "--ui-radius-md": theme.radius.md,
    "--ui-radius-lg": theme.radius.lg,
  };
}
