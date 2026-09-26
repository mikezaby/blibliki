import { Resolution } from "@blibliki/engine";

// How real-time record behaves. Console-wide, not part of the instrument:
// hardware keeps these global to the device too.
export type MidiRecordingSettings = {
  metronome: boolean;
  // The click plays only while a live recording runs.
  metronomeOnlyWhileRecording: boolean;
  // One bar of clicks before the transport starts.
  precount: boolean;
  // Notes snap to this grid, or keep their timing as microtime when off. A
  // grid finer than the track's step is the step.
  quantize: "off" | Resolution;
  // One pass over the loop, or until stopped.
  mode: "oneShot" | "loop";
  // Notes join what a step has, or replace it on the first note of a pass.
  overdub: boolean;
};

export const DEFAULT_MIDI_RECORDING_SETTINGS: MidiRecordingSettings = {
  metronome: false,
  metronomeOnlyWhileRecording: false,
  precount: false,
  quantize: Resolution.sixteenth,
  mode: "loop",
  overdub: true,
};

export const QUANTIZE_OPTIONS: MidiRecordingSettings["quantize"][] = [
  "off",
  ...Object.values(Resolution),
];

export function normalizeMidiRecordingSettings(
  value: unknown,
): MidiRecordingSettings {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<Record<keyof MidiRecordingSettings, unknown>>)
      : {};
  const defaults = DEFAULT_MIDI_RECORDING_SETTINGS;
  const bool = (
    key: "metronome" | "metronomeOnlyWhileRecording" | "precount" | "overdub",
  ) => (typeof candidate[key] === "boolean" ? candidate[key] : defaults[key]);

  return {
    metronome: bool("metronome"),
    metronomeOnlyWhileRecording: bool("metronomeOnlyWhileRecording"),
    precount: bool("precount"),
    overdub: bool("overdub"),
    quantize: QUANTIZE_OPTIONS.includes(
      candidate.quantize as MidiRecordingSettings["quantize"],
    )
      ? (candidate.quantize as MidiRecordingSettings["quantize"])
      : defaults.quantize,
    mode:
      candidate.mode === "oneShot" || candidate.mode === "loop"
        ? candidate.mode
        : defaults.mode,
  };
}
