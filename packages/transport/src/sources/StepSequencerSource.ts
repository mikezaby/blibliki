import { Transport } from "@/Transport";
import { Ticks } from "@/types";
import { Division, TPB } from "@/utils";
import { BaseSource } from "./BaseSource";
import type { SourceEvent } from "./BaseSource";

export interface StepSequencerSourceEvent extends SourceEvent {
  stepNo: number;
  pageNo: number;
  patternNo: number;
  step: IStep;
}

export type IStepNote = {
  note: string; // "C4", "E4", "G4"
  velocity: number; // 0-127
};

export type IStepCC = {
  cc: number;
  value: number;
};

// Individual step
export type IStep = {
  active: boolean; // Whether step is enabled/muted
  notes: IStepNote[]; // Multiple notes for chords
  ccMessages: IStepCC[]; // Multiple CC messages per step
  probability: number; // 0-100% chance to trigger
  microtimeOffset: number; // -50 to +50 ticks offset
  duration: Division;
};

// Page contains multiple steps
export type IPage = {
  name: string;
  steps: IStep[];
};

// Pattern contains multiple pages
export type IPattern = {
  name: string;
  pages: IPage[];
};

export enum Resolution {
  thirtysecond = "1/32",
  sixteenth = "1/16",
  eighth = "1/8",
  quarter = "1/4",
}

export enum PlaybackMode {
  loop = "loop",
  oneShot = "oneShot",
}

interface StepSequencerSourceProps {
  onEvent: (event: StepSequencerSourceEvent) => void;
  patterns: IPattern[];
  stepsPerPage: number; // 1-16 steps per page
  resolution: Resolution;
  playbackMode: PlaybackMode;
  patternSequence: string; // Pattern sequence notation (e.g., "2A4B2AC")
  enableSequence: boolean; // Toggle to enable/disable sequence mode
}

const RESOLUTION_TO_TICKS: Record<Resolution, number> = {
  [Resolution.thirtysecond]: TPB / 8, // 1920 ticks
  [Resolution.sixteenth]: TPB / 4, // 3840 ticks
  [Resolution.eighth]: TPB / 2, // 7680 ticks
  [Resolution.quarter]: TPB, // 15360 ticks
};

function expandPatternSequence(input: string): string[] {
  const result: string[] = [];
  let num = "";

  for (const ch of input) {
    if (ch >= "0" && ch <= "9") {
      num += ch;
    } else {
      const count = Number(num);
      for (let i = 0; i < count; i++) {
        result.push(ch);
      }
      num = "";
    }
  }

  return result.map((v) => v.toUpperCase());
}

export class StepSequencerSource extends BaseSource<StepSequencerSourceEvent> {
  props: StepSequencerSourceProps;
  private patternCount = 0;
  private expandedSequence: string[] = [];
  private currentPatternNo = 0;

  constructor(transport: Transport, props: StepSequencerSourceProps) {
    super(transport);

    this.props = props;
    this.expandedSequence = expandPatternSequence(props.patternSequence);
  }

  get stepTicks(): Ticks {
    return RESOLUTION_TO_TICKS[this.props.resolution];
  }

  get activePattern(): IPattern {
    const patternNo = this.props.enableSequence ? this.currentPatternNo : 0;
    const pattern = this.props.patterns[patternNo];
    if (!pattern) throw Error("Pattern not found");
    return pattern;
  }

  get totalPages(): number {
    return this.activePattern.pages.length;
  }

  get totalSteps(): number {
    return this.totalPages * this.props.stepsPerPage;
  }

  private getPatternNoFromSequence(patternCount: number): number {
    if (!this.props.enableSequence || this.expandedSequence.length === 0) {
      return 0;
    }

    const current = patternCount % this.expandedSequence.length;
    const patternName = this.expandedSequence[current];
    const patternNo = this.props.patterns.findIndex(
      (p) => p.name === patternName,
    );
    if (patternNo === -1) return 0;

    return patternNo;
  }

  private getPageNo(globalStepNo: number): number {
    return Math.floor(globalStepNo / this.props.stepsPerPage);
  }

  private getStepNo(globalStepNo: number): number {
    return globalStepNo % this.props.stepsPerPage;
  }

  private getStep(patternNo: number, pageNo: number, stepNo: number): IStep {
    const pattern = this.props.patterns[patternNo];
    if (!pattern) throw Error("Pattern not found");

    const page = pattern.pages[pageNo];
    if (!page) throw Error("Page not found");

    const step = page.steps[stepNo];
    if (!step) throw Error("Step not found");

    return step;
  }

  onStart(ticks: Ticks) {
    super.onStart(ticks);
    this.patternCount = 0;
    this.currentPatternNo = this.getPatternNoFromSequence(0);
  }

  generator(
    start: Ticks,
    end: Ticks,
  ): readonly Readonly<StepSequencerSourceEvent>[] {
    if (!this.startedAt) return [];

    const events: StepSequencerSourceEvent[] = [];
    const relativeTicks = start - this.startedAt;

    // Calculate which steps fall in the [start, end) range
    const startGlobalStep = Math.floor(relativeTicks / this.stepTicks);
    const endGlobalStep = Math.ceil((end - this.startedAt) / this.stepTicks);

    for (
      let globalStep = startGlobalStep;
      globalStep < endGlobalStep;
      globalStep++
    ) {
      // Check for pattern completion and sequence change
      const patternStepCount = this.totalSteps;
      const currentPatternIteration = Math.floor(globalStep / patternStepCount);

      if (currentPatternIteration > this.patternCount) {
        // Pattern completed, move to next in sequence
        this.patternCount = currentPatternIteration;
        this.currentPatternNo = this.getPatternNoFromSequence(
          this.patternCount,
        );
      }

      const globalStepInPattern = globalStep % patternStepCount;
      const stepTick = this.startedAt + globalStep * this.stepTicks;

      // Skip if step is outside the requested range
      if (stepTick < start || stepTick >= end) continue;

      // Check oneShot mode - stop at pattern boundary
      if (
        this.props.playbackMode === PlaybackMode.oneShot &&
        globalStep > 0 &&
        globalStepInPattern === 0
      ) {
        break;
      }

      const pageNo = this.getPageNo(globalStepInPattern);
      const stepNo = this.getStepNo(globalStepInPattern);
      const step = this.getStep(this.currentPatternNo, pageNo, stepNo);

      // Note: time and contextTime will be recalculated by Transport
      events.push({
        ticks: stepTick,
        time: 0,
        contextTime: 0,
        eventSourceId: this.id,
        stepNo,
        pageNo,
        patternNo: this.currentPatternNo,
        step,
      });
    }

    return events;
  }

  consumer(event: Readonly<StepSequencerSourceEvent>) {
    this.props.onEvent(event);
  }
}
