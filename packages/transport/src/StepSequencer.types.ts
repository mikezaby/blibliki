import type { TransportEvent } from "./Transport";
import type { ClockTime, ContextTime, Ticks } from "./types";
import type { Division } from "./utils";

// Step data within a page
export interface IStepNote {
  note: string; // "C4", "E4", etc.
  velocity: number; // 0-127
}

export interface IStepCC {
  cc: number; // 0-127
  value: number; // 0-127
}

export interface IStep {
  active: boolean;
  notes: IStepNote[];
  ccMessages: IStepCC[];
  probability: number; // 0-100
  microtimeOffset: number; // -100 to +100 (maps to ticks)
  duration: Division;
}

// Page (collection of steps)
export interface IPage {
  name: string;
  steps: IStep[];
}

// Pattern (collection of pages)
export interface IPattern {
  name: string;
  pages: IPage[];
}

// Enums
export type Resolution = "1/32" | "1/16" | "1/8" | "1/4";
export type PlaybackMode = "loop" | "oneShot";

// Runtime state
export interface SequencerState {
  isRunning: boolean;
  currentPattern: number;
  currentPage: number;
  currentStep: number;
  sequencePosition?: string; // "A (2/4)" for UI
}

// Pre-processed step data for callback
export interface ITriggeredStep {
  notes: IStepNote[];
  ccMessages: IStepCC[];
  duration: Division;
}

// Event scheduled through Transport
export interface StepEvent extends TransportEvent {
  ticks: Ticks;
  time: ClockTime;
  contextTime: ContextTime;
  step: ITriggeredStep;
  stepIndex: number;
  patternIndex: number;
  pageIndex: number;
}

// Callback types
export type StepTriggerCallback = (
  step: ITriggeredStep,
  timing: { contextTime: ContextTime; ticks: Ticks },
) => void;

export type StateChangeCallback = (state: SequencerState) => void;

// Configuration
export interface StepSequencerConfig {
  patterns: IPattern[];
  resolution: Resolution;
  stepsPerPage: number; // 1-16
  playbackMode: PlaybackMode;
  patternSequence: string; // "2A4B2AC"
  enableSequence: boolean;
  onStepTrigger: StepTriggerCallback;
  onStateChange?: StateChangeCallback;
  onComplete?: () => void;
}
