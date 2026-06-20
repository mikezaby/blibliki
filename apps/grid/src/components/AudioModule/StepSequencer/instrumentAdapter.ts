import type { IPage, IStep } from "@blibliki/engine";
import type {
  InstrumentSequencerPage,
  InstrumentSequencerStep,
} from "@/instruments/document";

function toInstrumentStep(step: IStep): InstrumentSequencerStep {
  if (step.duration === "infinity") {
    throw new Error(
      "Instrument sequencer steps cannot use an infinite duration",
    );
  }

  return {
    active: step.active,
    notes: step.notes,
    probability: step.probability,
    microtimeOffset: step.microtimeOffset,
    duration: step.duration,
  };
}

export function toEditorPages(pages: InstrumentSequencerPage[]): IPage[] {
  return pages.map((page) => ({
    ...page,
    steps: page.steps.map((step) => ({
      ...step,
      ccMessages: [],
    })),
  }));
}

export function updateInstrumentPageStep(
  pages: InstrumentSequencerPage[],
  pageIndex: number,
  stepIndex: number,
  step: IStep,
): InstrumentSequencerPage[] {
  return pages.map((page, currentPageIndex) => {
    if (currentPageIndex !== pageIndex) {
      return page;
    }

    return {
      ...page,
      steps: page.steps.map((currentStep, currentStepIndex) =>
        currentStepIndex === stepIndex ? toInstrumentStep(step) : currentStep,
      ),
    };
  });
}
