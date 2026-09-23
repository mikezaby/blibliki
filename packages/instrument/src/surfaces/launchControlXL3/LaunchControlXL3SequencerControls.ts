export const STEP_CONTROL_CCS = [13, 14, 15, 16, 17, 18, 19, 20] as const;
export const VELOCITY_CCS = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const PITCH_CCS = [29, 30, 31, 32, 33, 34, 35, 36] as const;
export const STEP_BUTTON_CCS = [
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
] as const;

// Encoders run in relative mode: 64 is no movement, each tick is one step.
export const RELATIVE_PIVOT = 64;

export function getRelativeDelta(ccValue: number) {
  return ccValue - RELATIVE_PIVOT;
}

export const STEP_LED_OFF = 0;
export const STEP_LED_PROGRAMMED = 64;
export const STEP_LED_PLAYHEAD = 96;
export const STEP_LED_HELD = 127;
