import type {
  InstrumentSequencerNote,
  InstrumentSequencerPage,
} from "@/document/types";

const HIT = "x";
const DEFAULT_VELOCITY = 100;

// One lane per note name, one character per step: "x" is a hit, anything else
// is a rest. { C1: "x...x...x...x...", "F#1": "..x...x...x...x." }
export type StepLanes = Record<string, string>;

export function writeStepLanes(
  page: InstrumentSequencerPage,
  lanes: StepLanes,
): InstrumentSequencerPage {
  return {
    ...page,
    steps: page.steps.map((step, stepIndex) => {
      const notes: InstrumentSequencerNote[] = Object.entries(lanes)
        .filter(([, lane]) => lane[stepIndex] === HIT)
        .map(([note]) => ({ note, velocity: DEFAULT_VELOCITY }));

      return notes.length > 0 ? { ...step, active: true, notes } : step;
    }),
  };
}
