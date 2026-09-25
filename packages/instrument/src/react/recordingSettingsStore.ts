import {
  DEFAULT_MIDI_RECORDING_SETTINGS,
  type MidiRecordingSettings,
  normalizeMidiRecordingSettings,
} from "@/sequencer/recordingSettings";

// The console keeps the recording settings in the browser, console-wide:
// they are how this performer records, not part of any instrument.
export const MIDI_RECORDING_SETTINGS_KEY = "blibliki.midiRecording";

export function loadMidiRecordingSettings(): MidiRecordingSettings {
  try {
    const raw = localStorage.getItem(MIDI_RECORDING_SETTINGS_KEY);

    return raw
      ? normalizeMidiRecordingSettings(JSON.parse(raw))
      : DEFAULT_MIDI_RECORDING_SETTINGS;
  } catch {
    return DEFAULT_MIDI_RECORDING_SETTINGS;
  }
}

export function saveMidiRecordingSettings(settings: MidiRecordingSettings) {
  try {
    localStorage.setItem(MIDI_RECORDING_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be missing or full; the session still has the settings.
  }
}
