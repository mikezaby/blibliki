const uiVars = {
  surface: {
    canvas: "var(--ui-color-surface-0)",
    panel: "var(--ui-color-surface-1)",
    raised: "var(--ui-color-surface-raised)",
    subtle: "var(--ui-color-surface-2)",
  },
  text: {
    primary: "var(--ui-color-text-primary)",
    secondary: "var(--ui-color-text-secondary)",
    muted: "var(--ui-color-text-muted)",
  },
  border: {
    subtle: "var(--ui-color-border-subtle)",
  },
} as const;

const toneVars = {
  primary: {
    "500": "var(--ui-color-primary-500)",
    "600": "var(--ui-color-primary-600)",
    contrast: "var(--ui-color-primary-contrast)",
  },
  secondary: {
    "500": "var(--ui-color-secondary-500)",
    "600": "var(--ui-color-secondary-600)",
    contrast: "var(--ui-color-secondary-contrast)",
  },
  success: {
    "500": "var(--ui-color-success-500)",
    "600": "var(--ui-color-success-600)",
    contrast: "var(--ui-color-success-contrast)",
  },
  warning: {
    "500": "var(--ui-color-warning-500)",
    "600": "var(--ui-color-warning-600)",
    contrast: "var(--ui-color-warning-contrast)",
  },
  error: {
    "500": "var(--ui-color-error-500)",
    "600": "var(--ui-color-error-600)",
    contrast: "var(--ui-color-error-contrast)",
  },
  info: {
    "500": "var(--ui-color-info-500)",
    "600": "var(--ui-color-info-600)",
    contrast: "var(--ui-color-info-contrast)",
  },
} as const;

type UIIntentTone = keyof typeof toneVars;
type UIIntentToneLevel = keyof (typeof toneVars)[UIIntentTone];

function uiTone(tone: UIIntentTone, level: UIIntentToneLevel = "500"): string {
  return toneVars[tone][level];
}

function uiColorMix(
  base: string,
  mixWith: string,
  mixWithPercent: number,
): string {
  return `color-mix(in oklab, ${base}, ${mixWith} ${mixWithPercent}%)`;
}

export {
  uiColorMix,
  uiTone,
  uiVars,
  type UIIntentTone,
  type UIIntentToneLevel,
};
