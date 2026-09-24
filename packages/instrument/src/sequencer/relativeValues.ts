import { Note } from "@blibliki/engine";

export const PITCH_MIN_MIDI = 24;
export const PITCH_MAX_MIDI = 96;

const NOTE_NAMES = [
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

function clampRelativeValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function mapRelativeBoolean(currentValue: boolean, delta: number) {
  if (delta === 0) {
    return currentValue;
  }

  return delta > 0;
}

export function mapRelativeNumber(
  currentValue: number,
  delta: number,
  min: number,
  max: number,
) {
  return clampRelativeValue(currentValue + delta, min, max);
}

export function mapRelativeEnum<T extends string>(
  currentValue: T,
  delta: number,
  options: readonly T[],
  fallback: T,
) {
  const currentIndex = options.indexOf(currentValue);
  const fallbackIndex = options.indexOf(fallback);
  const baseIndex =
    currentIndex >= 0 ? currentIndex : Math.max(fallbackIndex, 0);
  const index = clampRelativeValue(baseIndex + delta, 0, options.length - 1);

  return options[index] ?? fallback;
}

export function mapRelativeVelocity(currentValue: number, delta: number) {
  return clampRelativeValue(currentValue + delta, 0, 127);
}

export function midiNumberToNoteName(midiNumber: number) {
  const noteName = NOTE_NAMES[midiNumber % 12] ?? NOTE_NAMES[0];
  const octave = Math.floor(midiNumber / 12) - 2;

  return `${noteName}${octave}`;
}

// An empty slot turned up lands on `newNote`; turned below the range it is
// deleted, so one encoder both places and removes a note.
export function mapRelativePitch(
  currentNote: string | null | undefined,
  delta: number,
  newNote: string,
) {
  if (delta === 0) {
    return currentNote ?? null;
  }

  if (!currentNote && delta < 0) {
    return null;
  }

  const baseMidi = currentNote
    ? new Note(currentNote).midiNumber
    : new Note(newNote).midiNumber - 1;
  const nextMidi = baseMidi + delta;

  if (nextMidi < PITCH_MIN_MIDI) {
    return null;
  }

  return midiNumberToNoteName(
    clampRelativeValue(nextMidi, PITCH_MIN_MIDI, PITCH_MAX_MIDI),
  );
}
