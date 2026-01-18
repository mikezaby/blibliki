import type {
  IPattern,
  IPage,
  IStep,
  StepSequencerConfig,
} from "../../src/StepSequencer.types";

export function createDefaultStep(): IStep {
  return {
    active: false,
    notes: [],
    ccMessages: [],
    probability: 100,
    microtimeOffset: 0,
    duration: "1/16",
  };
}

export function createDefaultPage(name: string, steps: number = 16): IPage {
  return {
    name,
    steps: Array.from({ length: steps }, () => createDefaultStep()),
  };
}

export function createDefaultPattern(name: string): IPattern {
  return {
    name,
    pages: [createDefaultPage("Page 1")],
  };
}

export function createTestPattern(options?: {
  name?: string;
  steps?: number;
  activeSteps?: number[];
  notes?: Array<{ note: string; velocity: number }>;
}): IPattern {
  const name = options?.name ?? "Test";
  const steps = options?.steps ?? 16;
  const activeSteps = options?.activeSteps ?? [0, 4, 8, 12];
  const notes = options?.notes ?? [{ note: "C4", velocity: 100 }];

  const page = createDefaultPage("Page 1", steps);
  activeSteps.forEach((stepIndex) => {
    if (stepIndex < steps) {
      page.steps[stepIndex] = {
        ...page.steps[stepIndex],
        active: true,
        notes: [...notes],
      };
    }
  });

  return { name, pages: [page] };
}

export function createTestConfig(
  overrides?: Partial<StepSequencerConfig>,
): StepSequencerConfig {
  return {
    patterns: [createDefaultPattern("A")],
    resolution: "1/16",
    stepsPerPage: 16,
    playbackMode: "loop",
    patternSequence: "",
    enableSequence: false,
    onStepTrigger: () => {},
    ...overrides,
  };
}

export async function waitForScheduling(ms: number = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
