import { Transport } from "@/Transport";
import { Ticks } from "@/types";
import { Division, TPB } from "@/utils";
import { BaseSource } from "./BaseSource";
import type { SourceEvent } from "./BaseSource";

export interface StepSequencerSourceEvent extends SourceEvent {
  stepNo: number;
  pageNo: number;
  patternNo: number;
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
  onEvent: () => void;
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

export class StepSequencerSource extends BaseSource<SourceEvent> {
  props: StepSequencerSourceProps;

  constructor(transport: Transport, props: StepSequencerSourceProps) {
    super(transport);

    this.props = props;
  }

  get stepTicks(): Ticks {
    return RESOLUTION_TO_TICKS[this.props.resolution];
  }

  generator(_start: Ticks, _end: Ticks) {
    return [];
  }

  consumer(_event: Readonly<StepSequencerSourceEvent>) {
    // Not implemented yet
  }
}
