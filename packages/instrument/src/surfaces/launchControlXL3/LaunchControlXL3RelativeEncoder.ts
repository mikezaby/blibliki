import { Note } from "@blibliki/engine";
import {
  DEFAULT_NEW_NOTE,
  NOTE_NAMES,
  PITCH_MAX_MIDI,
  PITCH_MIN_MIDI,
  RELATIVE_PIVOT,
} from "./LaunchControlXL3SequencerControls";

function clampRelativeValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getRelativeDelta(value: number) {
  return value - RELATIVE_PIVOT;
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

function midiNumberToNoteName(midiNumber: number) {
  const noteName = NOTE_NAMES[midiNumber % 12] ?? NOTE_NAMES[0];
  const octave = Math.floor(midiNumber / 12) - 2;

  return `${noteName}${octave}`;
}

export function mapRelativePitch(
  currentNote: string | null | undefined,
  delta: number,
) {
  if (delta === 0) {
    return currentNote ?? null;
  }

  if (!currentNote && delta < 0) {
    return null;
  }

  const baseMidi = currentNote
    ? new Note(currentNote).midiNumber
    : new Note(DEFAULT_NEW_NOTE).midiNumber - 1;
  const nextMidi = baseMidi + delta;

  if (nextMidi < PITCH_MIN_MIDI) {
    return null;
  }

  return midiNumberToNoteName(
    clampRelativeValue(nextMidi, PITCH_MIN_MIDI, PITCH_MAX_MIDI),
  );
}
