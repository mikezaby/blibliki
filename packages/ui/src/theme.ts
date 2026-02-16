export type UIMode = "light" | "dark";

export interface UIColorTokens {
  surface0: string;
  surface1: string;
  surface2: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent500: string;
  accent400: string;
  accent600: string;
  accentContrast: string;
  danger500: string;
  dangerContrast: string;
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
  surface1: "oklch(0.96 0.006 260)",
  surface2: "oklch(0.92 0.008 260)",
  borderSubtle: "oklch(0.84 0.01 260)",
  textPrimary: "oklch(0.18 0.01 260)",
  textSecondary: "oklch(0.33 0.01 260)",
  textMuted: "oklch(0.48 0.01 260)",
  accent500: "oklch(0.67 0.16 244)",
  accent400: "oklch(0.75 0.13 244)",
  accent600: "oklch(0.59 0.19 244)",
  accentContrast: "oklch(0.98 0 0)",
  danger500: "oklch(0.63 0.24 28)",
  dangerContrast: "oklch(0.98 0 0)",
};

const defaultDark: UIColorTokens = {
  surface0: "oklch(0.12 0.01 260)",
  surface1: "oklch(0.16 0.01 260)",
  surface2: "oklch(0.21 0.01 260)",
  borderSubtle: "oklch(0.34 0.01 260)",
  textPrimary: "oklch(0.96 0.01 260)",
  textSecondary: "oklch(0.76 0.01 260)",
  textMuted: "oklch(0.62 0.01 260)",
  accent500: "oklch(0.67 0.16 244)",
  accent400: "oklch(0.75 0.13 244)",
  accent600: "oklch(0.59 0.19 244)",
  accentContrast: "oklch(0.98 0 0)",
  danger500: "oklch(0.63 0.24 28)",
  dangerContrast: "oklch(0.98 0 0)",
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
    "--ui-color-surface-1": colors.surface1,
    "--ui-color-surface-2": colors.surface2,
    "--ui-color-border-subtle": colors.borderSubtle,
    "--ui-color-text-primary": colors.textPrimary,
    "--ui-color-text-secondary": colors.textSecondary,
    "--ui-color-text-muted": colors.textMuted,
    "--ui-color-accent-500": colors.accent500,
    "--ui-color-accent-400": colors.accent400,
    "--ui-color-accent-600": colors.accent600,
    "--ui-color-accent-contrast": colors.accentContrast,
    "--ui-color-danger-500": colors.danger500,
    "--ui-color-danger-contrast": colors.dangerContrast,
    "--ui-radius-sm": theme.radius.sm,
    "--ui-radius-md": theme.radius.md,
    "--ui-radius-lg": theme.radius.lg,
  };
}
