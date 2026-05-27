import { PlaybackMode, Resolution, stepPropSchema } from "@blibliki/engine";

export const STEP_CONTROL_CCS = [13, 14, 15, 16, 17, 18, 19, 20] as const;
export const VELOCITY_CCS = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const PITCH_CCS = [29, 30, 31, 32, 33, 34, 35, 36] as const;
export const STEP_BUTTON_CCS = [
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
] as const;

export const DURATION_OPTIONS = stepPropSchema.duration.options;
export const RESOLUTION_OPTIONS = Object.values(Resolution);
export const PLAYBACK_OPTIONS = Object.values(PlaybackMode);

export const DEFAULT_NEW_NOTE_VELOCITY = 100;
export const DEFAULT_NEW_NOTE = "C3";
export const PITCH_MIN_MIDI = 24;
export const PITCH_MAX_MIDI = 96;
export const RELATIVE_PIVOT = 64;

export const STEP_LED_OFF = 0;
export const STEP_LED_PROGRAMMED = 64;
export const STEP_LED_PLAYHEAD = 96;
export const STEP_LED_SELECTED = 127;

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
