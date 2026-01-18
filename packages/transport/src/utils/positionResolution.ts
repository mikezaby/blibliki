import type { IPattern } from "../StepSequencer.types";

export function resolveStepPosition(
  globalStepNo: number,
  patterns: IPattern[],
  currentPatternIndex: number,
  stepsPerPage: number,
  enableSequence: boolean,
  expandedSequence: string[],
  sequencePatternCount = 0,
): {
  patternIndex: number;
  pageIndex: number;
  stepIndex: number;
} {
  // In sequence mode, determine pattern from sequence
  let patternIndex = currentPatternIndex;
  if (enableSequence && expandedSequence.length > 0) {
    const sequenceIndex = sequencePatternCount % expandedSequence.length;
    const patternName = expandedSequence[sequenceIndex];
    const foundIndex = patterns.findIndex((p) => p.name === patternName);
    if (foundIndex !== -1) {
      patternIndex = foundIndex;
    }
  }

  const pattern = patterns[patternIndex];
  if (!pattern) {
    throw new Error(`Pattern at index ${patternIndex} not found`);
  }

  const totalSteps = pattern.pages.length * stepsPerPage;

  // Normalize to pattern-local step number
  const localStepNo = globalStepNo % totalSteps;

  const pageIndex = Math.floor(localStepNo / stepsPerPage);
  const stepIndex = localStepNo % stepsPerPage;

  return { patternIndex, pageIndex, stepIndex };
}
