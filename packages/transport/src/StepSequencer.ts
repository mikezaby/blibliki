import type {
  IPattern,
  IPage,
  IStep,
  Resolution,
  SequencerState,
  StepSequencerConfig,
} from "./StepSequencer.types";
import type { Ticks } from "./types";
import { TPB } from "./utils";
import { expandPatternSequence } from "./utils/patternSequence";
import { resolveStepPosition } from "./utils/positionResolution";
import { calculateMicrotimingOffset } from "./utils/microtiming";

const RESOLUTION_TO_TICKS: Record<Resolution, number> = {
  "1/32": TPB / 8,
  "1/16": TPB / 4,
  "1/8": TPB / 2,
  "1/4": TPB,
};

export class StepSequencer {
  private config: StepSequencerConfig;
  private state: SequencerState;
  private expandedSequence: string[] = [];
  private sequencePatternCount = 0;
  private startTicks: Ticks = 0;
  private previousStepNo = -1;
  private previousGlobalStepNo = -1;
  private shouldStopAfterCurrentEvent = false;

  constructor(config: StepSequencerConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      currentPattern: 0,
      currentPage: 0,
      currentStep: 0,
      sequencePosition: undefined,
    };

    if (config.patternSequence) {
      this.expandedSequence = expandPatternSequence(config.patternSequence);
    }

    // Initialize internal state - these will be used in lifecycle methods (Tasks 7-10)
    this.resetInternalTracking();
    void this.getStepTicksForResolution();
    void this.sequencePatternCount;
    void this.startTicks;
    void this.shouldStopAfterCurrentEvent;
    void this.expandedSequence;
    void this.previousStepNo;
    void this.previousGlobalStepNo;
    void resolveStepPosition;
    void calculateMicrotimingOffset;
  }

  // State queries
  getState(): SequencerState {
    return { ...this.state };
  }

  getStep(patternIndex: number, pageIndex: number, stepIndex: number): IStep {
    const pattern = this.config.patterns[patternIndex];
    if (!pattern) throw new Error(`Pattern ${patternIndex} not found`);

    const page = pattern.pages[pageIndex];
    if (!page)
      throw new Error(`Page ${pageIndex} not found in pattern ${patternIndex}`);

    const step = page.steps[stepIndex];
    if (!step)
      throw new Error(`Step ${stepIndex} not found in page ${pageIndex}`);

    return step;
  }

  getPattern(index: number): IPattern {
    const pattern = this.config.patterns[index];
    if (!pattern) throw new Error(`Pattern ${index} not found`);
    return pattern;
  }

  getPage(patternIndex: number, pageIndex: number): IPage {
    const pattern = this.getPattern(patternIndex);
    const page = pattern.pages[pageIndex];
    if (!page)
      throw new Error(`Page ${pageIndex} not found in pattern ${patternIndex}`);
    return page;
  }

  // Helper methods
  private getStepTicksForResolution(): number {
    return RESOLUTION_TO_TICKS[this.config.resolution];
  }

  private resetInternalTracking(): void {
    this.previousStepNo = -1;
    this.previousGlobalStepNo = -1;
  }
}
