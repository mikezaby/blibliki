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
  private expandedSequence: string[] = [];
  private pageMapping: { patternNo: number; pageNo: number }[] = [];

  constructor(transport: Transport, props: StepSequencerSourceProps) {
    super(transport);

    this.props = props;
    this.expandedSequence = expandPatternSequence(props.patternSequence);
    this.pageMapping = this.buildPageMapping();
  }

  /**
   * Build a mapping of absolute pages to (patternNo, pageNo) for one full sequence cycle
   * Example: sequence "2A1B" with A having 2 pages, B having 1 page produces:
   * [A0, A1, A0, A1, B0]
   */
  private buildPageMapping(): { patternNo: number; pageNo: number }[] {
    const mapping: { patternNo: number; pageNo: number }[] = [];

    if (this.props.enableSequence && this.expandedSequence.length > 0) {
      // For each pattern letter in the expanded sequence
      for (const patternLetter of this.expandedSequence) {
        // Find the pattern by name
        const patternNo = this.props.patterns.findIndex(
          (p) => p.name.toUpperCase() === patternLetter,
        );

        if (patternNo === -1) continue;

        const pattern = this.props.patterns[patternNo];
        if (!pattern) continue;

        // Add all pages of this pattern to the mapping
        for (let pageNo = 0; pageNo < pattern.pages.length; pageNo++) {
          mapping.push({ patternNo, pageNo });
        }
      }
    } else {
      // No sequence mode - build mapping for all patterns sequentially
      for (
        let patternNo = 0;
        patternNo < this.props.patterns.length;
        patternNo++
      ) {
        const pattern = this.props.patterns[patternNo];
        if (!pattern) continue;

        for (let pageNo = 0; pageNo < pattern.pages.length; pageNo++) {
          mapping.push({ patternNo, pageNo });
        }
      }
    }

    return mapping;
  }

  get stepResolution(): Ticks {
    return RESOLUTION_TO_TICKS[this.props.resolution];
  }

  onStart(ticks: Ticks) {
    // Quantize to the start of the next bar
    const timeSignature = this.transport.timeSignature;
    const ticksPerBar = TPB * timeSignature[0];

    if (ticks % ticksPerBar === 0) {
      super.onStart(ticks);
      return;
    }

    // Calculate which bar we're in and round up to the next bar
    const currentBar = Math.floor(ticks / ticksPerBar);
    const nextBarTicks = (currentBar + 1) * ticksPerBar;

    super.onStart(nextBarTicks);
  }

  extractStepsTicks(start: Ticks, end: Ticks): Ticks[] {
    const result: number[] = [];
    const stepResolution = this.stepResolution;

    // Calculate which step we should be at, then convert back to absolute ticks
    const stepsSinceStart = Math.floor(
      (start - this.startedAt!) / stepResolution,
    );
    const actualStart = this.startedAt! + stepsSinceStart * stepResolution;

    for (let value = actualStart; value <= end; value += stepResolution) {
      if (!this.shouldGenerate(value)) continue;

      result.push(value);
      this.lastGeneratedTick = value;
    }

    return result;
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

  /**
   * Calculate ticks per page based on step resolution and steps per page
   */
  get ticksPerPage(): Ticks {
    return this.stepResolution * this.props.stepsPerPage;
  }

  /**
   * Calculate absolute page number from tick position
   */
  private getAbsolutePageFromTicks(ticks: Ticks): number {
    if (this.startedAt === undefined) return 0;

    const ticksSinceStart = ticks - this.startedAt;
    return Math.floor(ticksSinceStart / this.ticksPerPage);
  }

  /**
   * Calculate step number within the current page from tick position
   */
  private getStepNoInPage(ticks: Ticks): number {
    if (this.startedAt === undefined) return 0;

    const ticksSinceStart = ticks - this.startedAt;
    const ticksIntoPage = ticksSinceStart % this.ticksPerPage;
    return Math.floor(ticksIntoPage / this.stepResolution);
  }

  /**
   * Map absolute page number to actual pattern and page indices
   * Takes into account sequence mode and playback mode (loop vs oneShot)
   */
  private getPatternAndPageFromAbsolutePage(absolutePage: number): {
    patternNo: number;
    pageNo: number;
  } {
    if (this.pageMapping.length === 0) {
      return { patternNo: 0, pageNo: 0 };
    }

    let index: number;
    if (this.props.playbackMode === PlaybackMode.loop) {
      index = absolutePage % this.pageMapping.length;
    } else {
      // oneShot mode - stop at the last page
      index = Math.min(absolutePage, this.pageMapping.length - 1);
    }

    return this.pageMapping[index] ?? { patternNo: 0, pageNo: 0 };
  }

  generator(
    start: Ticks,
    end: Ticks,
  ): readonly Readonly<StepSequencerSourceEvent>[] {
    if (!this.isPlaying(start, end) || this.startedAt === undefined) return [];

    const stepTicks = this.extractStepsTicks(start, end);

    // Check if we should stop in oneShot mode
    if (
      this.props.playbackMode === PlaybackMode.oneShot &&
      stepTicks.length > 0
    ) {
      const lastTick = stepTicks[stepTicks.length - 1];
      if (lastTick !== undefined) {
        const absolutePage = this.getAbsolutePageFromTicks(lastTick);
        const stepNo = this.getStepNoInPage(lastTick);

        // If we've reached or passed the last page and last step, stop the source
        if (
          absolutePage >= this.pageMapping.length - 1 &&
          stepNo >= this.props.stepsPerPage - 1
        ) {
          // Stop after this final step
          this.onStop(lastTick + this.stepResolution);
        }
      }
    }

    return stepTicks.map((ticks) => {
      const absolutePage = this.getAbsolutePageFromTicks(ticks);
      const { patternNo, pageNo } =
        this.getPatternAndPageFromAbsolutePage(absolutePage);
      const stepNo = this.getStepNoInPage(ticks);

      const step = this.getStep(patternNo, pageNo, stepNo);

      return {
        ticks,
        time: 0,
        contextTime: 0,
        eventSourceId: this.id,
        stepNo,
        pageNo,
        patternNo,
        step,
      };
    });
  }

  consumer(event: Readonly<StepSequencerSourceEvent>) {
    this.props.onEvent(event);
  }
}
