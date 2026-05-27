import type { MidiPortSelection } from "@/core/midiPortSelection";

export const DEFAULT_TRACK_BPM = 120;
export const DEFAULT_TRACK_TIME_SIGNATURE = [4, 4] as const;

export const DEFAULT_TRACK_NOTE_INPUT: MidiPortSelection = {
  selectedId: "computer_keyboard",
  selectedName: "Computer Keyboard",
  allIns: false,
  excludedIds: [],
  excludedNames: [],
};
