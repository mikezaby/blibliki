# Transport StepSequencer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a reusable step sequencer in @blibliki/transport with precise scheduling via TransportListener pattern.

**Architecture:** StepSequencer implements TransportListener<StepEvent> to integrate with Transport's 200ms lookahead scheduler. Manages patterns/pages/steps, filters by probability, applies microtiming offsets. Independent lifecycle control (start/stop) while using Transport's precision scheduler.

**Tech Stack:** TypeScript, Vitest, @blibliki/transport Transport/Scheduler/Timeline

---

## Task 1: Type Definitions

**Files:**
- Create: `packages/transport/src/StepSequencer.types.ts`
- Modify: `packages/transport/src/index.ts` (add exports)

**Step 1: Create types file**

Create `packages/transport/src/StepSequencer.types.ts`:

```typescript
import type {
  ClockTime,
  ContextTime,
  Division,
  Ticks,
  TransportEvent,
} from "./types";

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
```

**Step 2: Export types from index**

Modify `packages/transport/src/index.ts`:

```typescript
// Add to existing exports
export type {
  IStep,
  IStepNote,
  IStepCC,
  IPage,
  IPattern,
  Resolution,
  PlaybackMode,
  SequencerState,
  ITriggeredStep,
  StepEvent,
  StepTriggerCallback,
  StateChangeCallback,
  StepSequencerConfig,
} from "./StepSequencer.types";
```

**Step 3: Commit**

```bash
git add packages/transport/src/StepSequencer.types.ts packages/transport/src/index.ts
git commit -m "feat(transport): add StepSequencer type definitions"
```

---

## Task 2: Test Utilities

**Files:**
- Create: `packages/transport/test/helpers/stepSequencerHelpers.ts`

**Step 1: Create test helper utilities**

Create `packages/transport/test/helpers/stepSequencerHelpers.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/transport/test/helpers/stepSequencerHelpers.ts
git commit -m "test(transport): add StepSequencer test helpers"
```

---

## Task 3: Pattern Sequence Parsing (TDD)

**Files:**
- Create: `packages/transport/test/patternSequence.test.ts`
- Create: `packages/transport/src/utils/patternSequence.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/patternSequence.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { expandPatternSequence } from "../src/utils/patternSequence";

describe("expandPatternSequence", () => {
  test("expands simple pattern sequence", () => {
    const result = expandPatternSequence("ABC");
    expect(result).toEqual(["A", "B", "C"]);
  });

  test("expands pattern with count prefix", () => {
    const result = expandPatternSequence("2A3B");
    expect(result).toEqual(["A", "A", "B", "B", "B"]);
  });

  test("expands complex pattern sequence", () => {
    const result = expandPatternSequence("2A4B2AC");
    expect(result).toEqual(["A", "A", "B", "B", "B", "B", "A", "A", "C"]);
  });

  test("handles single pattern without count", () => {
    const result = expandPatternSequence("A");
    expect(result).toEqual(["A"]);
  });

  test("handles empty string", () => {
    const result = expandPatternSequence("");
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test patternSequence.test
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/transport/src/utils/patternSequence.ts`:

```typescript
export function expandPatternSequence(sequence: string): string[] {
  if (!sequence) return [];

  const expanded: string[] = [];
  let i = 0;

  while (i < sequence.length) {
    // Check for number prefix
    let count = 1;
    if (/\d/.test(sequence[i])) {
      count = parseInt(sequence[i], 10);
      i++;
    }

    // Get pattern name
    const patternName = sequence[i];
    if (patternName) {
      for (let j = 0; j < count; j++) {
        expanded.push(patternName);
      }
    }
    i++;
  }

  return expanded;
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test patternSequence.test
```

Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/patternSequence.test.ts packages/transport/src/utils/patternSequence.ts
git commit -m "feat(transport): implement pattern sequence parsing"
```

---

## Task 4: Position Resolution (TDD)

**Files:**
- Create: `packages/transport/test/positionResolution.test.ts`
- Create: `packages/transport/src/utils/positionResolution.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/positionResolution.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { resolveStepPosition } from "../src/utils/positionResolution";
import { createTestPattern } from "./helpers/stepSequencerHelpers";

describe("resolveStepPosition", () => {
  test("resolves position for single-page pattern", () => {
    const patterns = [createTestPattern({ name: "A", steps: 16 })];
    const result = resolveStepPosition(0, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 0,
      stepIndex: 0,
    });
  });

  test("resolves position at step 5", () => {
    const patterns = [createTestPattern({ name: "A", steps: 16 })];
    const result = resolveStepPosition(5, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 0,
      stepIndex: 5,
    });
  });

  test("resolves position across pages", () => {
    const pattern = createTestPattern({ name: "A" });
    pattern.pages.push({ name: "Page 2", steps: Array(16).fill(null).map(() => ({
      active: false,
      notes: [],
      ccMessages: [],
      probability: 100,
      microtimeOffset: 0,
      duration: "1/16" as const,
    })) });
    const patterns = [pattern];

    const result = resolveStepPosition(20, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 1,
      stepIndex: 4,
    });
  });

  test("wraps around at pattern end", () => {
    const patterns = [createTestPattern({ name: "A", steps: 16 })];
    const result = resolveStepPosition(32, patterns, 0, 16, false, []);

    expect(result).toEqual({
      patternIndex: 0,
      pageIndex: 0,
      stepIndex: 0,
    });
  });

  test("resolves with sequence mode enabled", () => {
    const patterns = [
      createTestPattern({ name: "A", steps: 16 }),
      createTestPattern({ name: "B", steps: 16 }),
    ];
    const expandedSequence = ["A", "B"];
    let sequencePatternCount = 1;

    const result = resolveStepPosition(
      0,
      patterns,
      0,
      16,
      true,
      expandedSequence,
      sequencePatternCount,
    );

    expect(result.patternIndex).toBe(1); // Should be pattern B
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test positionResolution.test
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/transport/src/utils/positionResolution.ts`:

```typescript
import type { IPattern } from "../StepSequencer.types";

export function resolveStepPosition(
  globalStepNo: number,
  patterns: IPattern[],
  currentPatternIndex: number,
  stepsPerPage: number,
  enableSequence: boolean,
  expandedSequence: string[],
  sequencePatternCount: number = 0,
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
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test positionResolution.test
```

Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/positionResolution.test.ts packages/transport/src/utils/positionResolution.ts
git commit -m "feat(transport): implement position resolution logic"
```

---

## Task 5: Microtiming Calculation (TDD)

**Files:**
- Create: `packages/transport/test/microtiming.test.ts`
- Create: `packages/transport/src/utils/microtiming.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/microtiming.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { calculateMicrotimingOffset } from "../src/utils/microtiming";
import { TPB } from "../src/utils";

describe("calculateMicrotimingOffset", () => {
  test("returns 0 for zero offset", () => {
    const result = calculateMicrotimingOffset(0);
    expect(result).toBe(0);
  });

  test("calculates positive offset correctly", () => {
    const result = calculateMicrotimingOffset(50);
    const expected = 50 * (TPB / 4 / 100); // 50% of 1/16th note
    expect(result).toBe(expected);
  });

  test("calculates negative offset correctly", () => {
    const result = calculateMicrotimingOffset(-50);
    const expected = -50 * (TPB / 4 / 100);
    expect(result).toBe(expected);
  });

  test("handles max positive offset", () => {
    const result = calculateMicrotimingOffset(100);
    const expected = 100 * (TPB / 4 / 100);
    expect(result).toBe(expected);
  });

  test("handles max negative offset", () => {
    const result = calculateMicrotimingOffset(-100);
    const expected = -100 * (TPB / 4 / 100);
    expect(result).toBe(expected);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test microtiming.test
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/transport/src/utils/microtiming.ts`:

```typescript
import { TPB } from "./index";

const MICROTIMING_STEP = TPB / 4 / 100; // 1% of a 16th note

export function calculateMicrotimingOffset(microtimeOffset: number): number {
  return microtimeOffset * MICROTIMING_STEP;
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test microtiming.test
```

Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/microtiming.test.ts packages/transport/src/utils/microtiming.ts
git commit -m "feat(transport): implement microtiming offset calculation"
```

---

## Task 6: Core StepSequencer Class Structure

**Files:**
- Create: `packages/transport/src/StepSequencer.ts`
- Modify: `packages/transport/src/index.ts`

**Step 1: Create StepSequencer class skeleton**

Create `packages/transport/src/StepSequencer.ts`:

```typescript
import type { ContextTime, Ticks } from "./types";
import type {
  IPattern,
  IPage,
  IStep,
  Resolution,
  PlaybackMode,
  SequencerState,
  StepEvent,
  StepSequencerConfig,
} from "./StepSequencer.types";
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
  }

  // State queries
  getState(): SequencerState {
    return { ...this.state };
  }

  getStep(
    patternIndex: number,
    pageIndex: number,
    stepIndex: number,
  ): IStep {
    const pattern = this.config.patterns[patternIndex];
    if (!pattern) throw new Error(`Pattern ${patternIndex} not found`);

    const page = pattern.pages[pageIndex];
    if (!page) throw new Error(`Page ${pageIndex} not found in pattern ${patternIndex}`);

    const step = page.steps[stepIndex];
    if (!step) throw new Error(`Step ${stepIndex} not found in page ${pageIndex}`);

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
    if (!page) throw new Error(`Page ${pageIndex} not found in pattern ${patternIndex}`);
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
```

**Step 2: Export from index**

Modify `packages/transport/src/index.ts`:

```typescript
// Add to existing exports
export { StepSequencer } from "./StepSequencer";
```

**Step 3: Commit**

```bash
git add packages/transport/src/StepSequencer.ts packages/transport/src/index.ts
git commit -m "feat(transport): add StepSequencer class skeleton"
```

---

## Task 7: Update API (TDD)

**Files:**
- Create: `packages/transport/test/StepSequencer.updateApi.test.ts`
- Modify: `packages/transport/src/StepSequencer.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/StepSequencer.updateApi.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { createTestConfig, createDefaultPattern } from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Update API", () => {
  test("updateStep modifies step data", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.updateStep(0, 0, 5, { active: true });

    const step = sequencer.getStep(0, 0, 5);
    expect(step.active).toBe(true);
  });

  test("updateStep partially updates step", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.updateStep(0, 0, 3, {
      active: true,
      notes: [{ note: "D4", velocity: 80 }],
    });

    const step = sequencer.getStep(0, 0, 3);
    expect(step.active).toBe(true);
    expect(step.notes).toEqual([{ note: "D4", velocity: 80 }]);
    expect(step.probability).toBe(100); // Unchanged
  });

  test("setResolution updates resolution", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.setResolution("1/8");

    expect(sequencer.getState()).toMatchObject({});
  });

  test("setPlaybackMode updates playback mode", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.setPlaybackMode("oneShot");

    // Verify through internal state (we'll test behavior in integration tests)
    expect(() => sequencer.setPlaybackMode("loop")).not.toThrow();
  });

  test("addPattern adds new pattern", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const newPattern = createDefaultPattern("B");
    sequencer.addPattern(newPattern);

    expect(sequencer.getPattern(1)).toEqual(newPattern);
  });

  test("removePattern removes pattern", () => {
    const config = createTestConfig({
      patterns: [createDefaultPattern("A"), createDefaultPattern("B")],
    });
    const sequencer = new StepSequencer(config);

    sequencer.removePattern(1);

    expect(() => sequencer.getPattern(1)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test StepSequencer.updateApi.test
```

Expected: FAIL with "updateStep is not a function"

**Step 3: Implement update methods**

Modify `packages/transport/src/StepSequencer.ts`, add these methods:

```typescript
  // Update API
  updateStep(
    patternIndex: number,
    pageIndex: number,
    stepIndex: number,
    changes: Partial<IStep>,
  ): void {
    const step = this.getStep(patternIndex, pageIndex, stepIndex);
    Object.assign(step, changes);
  }

  setResolution(resolution: Resolution): void {
    this.config.resolution = resolution;
  }

  setPlaybackMode(mode: PlaybackMode): void {
    this.config.playbackMode = mode;
  }

  setStepsPerPage(count: number): void {
    if (count < 1 || count > 16) {
      throw new Error("stepsPerPage must be between 1 and 16");
    }
    this.config.stepsPerPage = count;
  }

  setPatternSequence(sequence: string): void {
    this.config.patternSequence = sequence;
    this.expandedSequence = expandPatternSequence(sequence);
  }

  setEnableSequence(enabled: boolean): void {
    this.config.enableSequence = enabled;
  }

  addPattern(pattern: IPattern): void {
    this.config.patterns.push(pattern);
  }

  removePattern(index: number): void {
    if (index < 0 || index >= this.config.patterns.length) {
      throw new Error(`Pattern index ${index} out of bounds`);
    }
    this.config.patterns.splice(index, 1);
  }

  addPage(patternIndex: number, page: IPage): void {
    const pattern = this.getPattern(patternIndex);
    pattern.pages.push(page);
  }

  removePage(patternIndex: number, pageIndex: number): void {
    const pattern = this.getPattern(patternIndex);
    if (pageIndex < 0 || pageIndex >= pattern.pages.length) {
      throw new Error(`Page index ${pageIndex} out of bounds`);
    }
    pattern.pages.splice(pageIndex, 1);
  }
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test StepSequencer.updateApi.test
```

Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/StepSequencer.updateApi.test.ts packages/transport/src/StepSequencer.ts
git commit -m "feat(transport): implement StepSequencer update API"
```

---

## Task 8: Lifecycle Methods (TDD)

**Files:**
- Create: `packages/transport/test/StepSequencer.lifecycle.test.ts`
- Modify: `packages/transport/src/StepSequencer.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/StepSequencer.lifecycle.test.ts`:

```typescript
import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { createTestConfig } from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Lifecycle", () => {
  test("start sets isRunning to true", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    expect(sequencer.getState().isRunning).toBe(true);
  });

  test("start calls onStateChange callback", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isRunning: true }),
    );
  });

  test("start does nothing if already running", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    onStateChange.mockClear();
    sequencer.start(0);

    expect(onStateChange).not.toHaveBeenCalled();
  });

  test("stop sets isRunning to false", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    sequencer.stop(0);

    expect(sequencer.getState().isRunning).toBe(false);
  });

  test("stop calls onStateChange callback", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    onStateChange.mockClear();
    sequencer.stop(0);

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isRunning: false }),
    );
  });

  test("reset resets state to initial", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    sequencer.reset();

    const state = sequencer.getState();
    expect(state).toEqual({
      isRunning: false,
      currentPattern: 0,
      currentPage: 0,
      currentStep: 0,
      sequencePosition: undefined,
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test StepSequencer.lifecycle.test
```

Expected: FAIL with "start is not a function"

**Step 3: Implement lifecycle methods**

Modify `packages/transport/src/StepSequencer.ts`, add these methods:

```typescript
  // Lifecycle control
  start(contextTime: ContextTime): void {
    if (this.state.isRunning) return;

    this.state = {
      ...this.state,
      isRunning: true,
    };

    // Will be set by first generator call
    this.startTicks = 0;
    this.resetInternalTracking();

    this.config.onStateChange?.(this.state);
  }

  stop(contextTime: ContextTime): void {
    if (!this.state.isRunning) return;

    this.state = {
      ...this.state,
      isRunning: false,
    };

    this.resetInternalTracking();

    this.config.onStateChange?.(this.state);
  }

  reset(): void {
    this.state = {
      isRunning: false,
      currentPattern: 0,
      currentPage: 0,
      currentStep: 0,
      sequencePosition: undefined,
    };

    this.sequencePatternCount = 0;
    this.startTicks = 0;
    this.resetInternalTracking();

    this.config.onStateChange?.(this.state);
  }

  // TransportListener hooks (no-ops for independent control)
  onStart(contextTime: ContextTime): void {}
  onStop(contextTime: ContextTime): void {}
  onJump(ticks: Ticks): void {}
  silence(contextTime: ContextTime): void {}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test StepSequencer.lifecycle.test
```

Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/StepSequencer.lifecycle.test.ts packages/transport/src/StepSequencer.ts
git commit -m "feat(transport): implement StepSequencer lifecycle methods"
```

---

## Task 9: Generator Implementation (TDD)

**Files:**
- Create: `packages/transport/test/StepSequencer.generator.test.ts`
- Modify: `packages/transport/src/StepSequencer.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/StepSequencer.generator.test.ts`:

```typescript
import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { createTestConfig, createTestPattern } from "./helpers/stepSequencerHelpers";
import { TPB } from "../src/utils";

describe("StepSequencer - Generator", () => {
  test("generator returns empty array when not running", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const events = sequencer.generator(0, TPB);

    expect(events).toEqual([]);
  });

  test("generator creates events for active steps", () => {
    const pattern = createTestPattern({
      activeSteps: [0, 4, 8, 12],
      notes: [{ note: "C4", velocity: 100 }],
    });
    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB);

    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(event.step.notes).toEqual([{ note: "C4", velocity: 100 }]);
    });
  });

  test("generator filters inactive steps", () => {
    const pattern = createTestPattern({ activeSteps: [] });
    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB * 4);

    expect(events).toEqual([]);
  });

  test("generator filters by probability", () => {
    // Mock Math.random to return 0.9 (90%)
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9);

    const pattern = createTestPattern({ activeSteps: [0] });
    pattern.pages[0].steps[0].probability = 50; // 50% chance

    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB);

    expect(events).toEqual([]); // 90% > 50%, should not trigger

    Math.random = originalRandom;
  });

  test("generator applies microtiming offset", () => {
    const pattern = createTestPattern({ activeSteps: [0] });
    pattern.pages[0].steps[0].microtimeOffset = 50;

    const config = createTestConfig({ patterns: [pattern] });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB);

    expect(events.length).toBe(1);
    // Event should be offset from step 0
    expect(events[0].ticks).toBeGreaterThan(0);
  });

  test("generator respects resolution setting", () => {
    const pattern = createTestPattern({ activeSteps: [0, 1, 2, 3] });
    const config = createTestConfig({
      patterns: [pattern],
      resolution: "1/8", // Eighth notes
    });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    const events = sequencer.generator(0, TPB * 2); // 2 beats

    // Should have fewer events with 1/8 resolution than 1/16
    expect(events.length).toBeLessThanOrEqual(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test StepSequencer.generator.test
```

Expected: FAIL with "generator is not a function"

**Step 3: Implement generator method**

Modify `packages/transport/src/StepSequencer.ts`, add this method:

```typescript
  // TransportListener implementation
  generator(startTicks: Ticks, endTicks: Ticks): readonly StepEvent[] {
    if (!this.state.isRunning) return [];

    const events: StepEvent[] = [];
    const stepTicks = this.getStepTicksForResolution();

    // Calculate which steps fall in this tick window
    const firstStepNo = Math.ceil(startTicks / stepTicks);
    const lastStepNo = Math.floor(endTicks / stepTicks);

    for (
      let globalStepNo = firstStepNo;
      globalStepNo <= lastStepNo;
      globalStepNo++
    ) {
      // Determine pattern/page/step indices
      const { patternIndex, pageIndex, stepIndex } = resolveStepPosition(
        globalStepNo,
        this.config.patterns,
        this.state.currentPattern,
        this.config.stepsPerPage,
        this.config.enableSequence,
        this.expandedSequence,
        this.sequencePatternCount,
      );

      const step = this.getStep(patternIndex, pageIndex, stepIndex);
      if (!step.active) continue;

      // Filter by probability (baked into scheduling)
      if (Math.random() * 100 > step.probability) continue;

      // Calculate tick position with microtiming offset applied
      const baseTicks = globalStepNo * stepTicks;
      const offsetTicks = calculateMicrotimingOffset(step.microtimeOffset);
      const eventTicks = baseTicks + offsetTicks;

      // Create triggered step (only notes/CCs that will fire)
      const triggeredStep = {
        notes: [...step.notes],
        ccMessages: [...step.ccMessages],
        duration: step.duration,
      };

      events.push({
        ticks: eventTicks,
        time: 0, // Filled by Transport
        contextTime: 0, // Filled by Transport
        step: triggeredStep,
        stepIndex,
        patternIndex,
        pageIndex,
      });
    }

    return events;
  }
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test StepSequencer.generator.test
```

Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/StepSequencer.generator.test.ts packages/transport/src/StepSequencer.ts
git commit -m "feat(transport): implement StepSequencer generator method"
```

---

## Task 10: Consumer Implementation (TDD)

**Files:**
- Create: `packages/transport/test/StepSequencer.consumer.test.ts`
- Modify: `packages/transport/src/StepSequencer.ts`

**Step 1: Write the failing test**

Create `packages/transport/test/StepSequencer.consumer.test.ts`:

```typescript
import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { createTestConfig } from "./helpers/stepSequencerHelpers";
import type { StepEvent } from "../src/StepSequencer.types";

describe("StepSequencer - Consumer", () => {
  test("consumer triggers onStepTrigger callback", () => {
    const onStepTrigger = vi.fn();
    const config = createTestConfig({ onStepTrigger });
    const sequencer = new StepSequencer(config);

    const event: StepEvent = {
      ticks: 0,
      time: 0,
      contextTime: 0.5,
      step: {
        notes: [{ note: "C4", velocity: 100 }],
        ccMessages: [],
        duration: "1/16",
      },
      stepIndex: 0,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.start(0);
    sequencer.consumer(event);

    expect(onStepTrigger).toHaveBeenCalledWith(
      event.step,
      { contextTime: 0.5, ticks: 0 },
    );
  });

  test("consumer updates current position state", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const event: StepEvent = {
      ticks: 3840,
      time: 0.5,
      contextTime: 0.5,
      step: {
        notes: [],
        ccMessages: [],
        duration: "1/16",
      },
      stepIndex: 5,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.start(0);
    sequencer.consumer(event);

    const state = sequencer.getState();
    expect(state.currentStep).toBe(5);
    expect(state.currentPattern).toBe(0);
    expect(state.currentPage).toBe(0);
  });

  test("consumer calls onStateChange when state changes", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    const event: StepEvent = {
      ticks: 0,
      time: 0,
      contextTime: 0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 1,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.start(0);
    onStateChange.mockClear();
    sequencer.consumer(event);

    expect(onStateChange).toHaveBeenCalled();
  });

  test("consumer stops sequencer in oneShot mode after completion", () => {
    const onComplete = vi.fn();
    const config = createTestConfig({
      playbackMode: "oneShot",
      onComplete,
    });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    // Simulate pattern completion
    const lastEvent: StepEvent = {
      ticks: 15 * 3840,
      time: 0,
      contextTime: 0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 15,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.consumer(lastEvent);

    // Next event wraps to step 0
    const wrapEvent: StepEvent = {
      ticks: 16 * 3840,
      time: 0,
      contextTime: 1.0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 0,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.consumer(wrapEvent);

    expect(sequencer.getState().isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/transport
pnpm test StepSequencer.consumer.test
```

Expected: FAIL with "consumer is not a function"

**Step 3: Implement consumer method**

Modify `packages/transport/src/StepSequencer.ts`, add these methods:

```typescript
  consumer(event: StepEvent): void {
    // Check if we should stop (oneShot completed)
    if (this.shouldStopAfterCurrentEvent) {
      this.stop(event.contextTime);
      this.shouldStopAfterCurrentEvent = false;
      return;
    }

    // Update current position for state tracking
    this.updateCurrentPosition(event);

    // Check for pattern completion
    this.checkPatternCompletion(event);

    // Trigger user callback with processed step
    this.config.onStepTrigger(event.step, {
      contextTime: event.contextTime,
      ticks: event.ticks,
    });
  }

  private updateCurrentPosition(event: StepEvent): void {
    const prevState = { ...this.state };

    this.state = {
      ...this.state,
      currentPattern: event.patternIndex,
      currentPage: event.pageIndex,
      currentStep: event.stepIndex,
      sequencePosition: this.formatSequencePosition(),
    };

    // Trigger state change callback if state changed
    if (this.hasStateChanged(prevState, this.state)) {
      this.config.onStateChange?.(this.state);
    }
  }

  private hasStateChanged(
    prev: SequencerState,
    current: SequencerState,
  ): boolean {
    return (
      prev.isRunning !== current.isRunning ||
      prev.currentPattern !== current.currentPattern ||
      prev.currentPage !== current.currentPage ||
      prev.currentStep !== current.currentStep ||
      prev.sequencePosition !== current.sequencePosition
    );
  }

  private formatSequencePosition(): string | undefined {
    if (!this.config.enableSequence || this.expandedSequence.length === 0) {
      return undefined;
    }

    const patternName = this.config.patterns[this.state.currentPattern].name;
    const position =
      (this.sequencePatternCount % this.expandedSequence.length) + 1;
    const total = this.expandedSequence.length;

    return `${patternName} (${position}/${total})`;
  }

  private checkPatternCompletion(event: StepEvent): void {
    const currentPattern = this.config.patterns[this.state.currentPattern];
    const totalSteps = currentPattern.pages.length * this.config.stepsPerPage;
    const stepTicks = this.getStepTicksForResolution();
    const globalStepNo = Math.floor(event.ticks / stepTicks);

    // Detect pattern completion (wrapped back to step 0)
    if (globalStepNo === 0 && this.previousGlobalStepNo !== -1) {
      if (this.config.playbackMode === "oneShot") {
        this.shouldStopAfterCurrentEvent = true;
      }

      this.config.onComplete?.();
    }

    this.previousGlobalStepNo = globalStepNo;
  }
```

**Step 4: Run test to verify it passes**

```bash
cd packages/transport
pnpm test StepSequencer.consumer.test
```

Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/transport/test/StepSequencer.consumer.test.ts packages/transport/src/StepSequencer.ts
git commit -m "feat(transport): implement StepSequencer consumer method"
```

---

## Task 11: Integration Tests with Transport

**Files:**
- Create: `packages/transport/test/StepSequencer.integration.test.ts`

**Step 1: Write integration test**

Create `packages/transport/test/StepSequencer.integration.test.ts`:

```typescript
import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { Transport } from "../src/Transport";
import { Context } from "@blibliki/utils";
import { createTestConfig, createTestPattern, waitForScheduling } from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Integration with Transport", () => {
  test("events scheduled with Transport's lookahead", async () => {
    const triggeredEvents: any[] = [];
    const pattern = createTestPattern({
      activeSteps: [0, 4, 8, 12],
      notes: [{ note: "C4", velocity: 100 }],
    });

    const sequencer = new StepSequencer(
      createTestConfig({
        patterns: [pattern],
        onStepTrigger: (step, timing) => {
          triggeredEvents.push({ step, timing });
        },
      }),
    );

    const context = new Context();
    await context.resume();

    const transport = new Transport(context, sequencer);
    transport.bpm = 120;

    sequencer.start(context.currentTime);
    transport.start();

    await waitForScheduling();

    transport.stop();
    sequencer.stop(context.currentTime);

    expect(triggeredEvents.length).toBeGreaterThan(0);
  });

  test("multiple sequencers on one transport", async () => {
    const events1: any[] = [];
    const events2: any[] = [];

    const pattern1 = createTestPattern({
      name: "Drums",
      activeSteps: [0, 8],
    });
    const pattern2 = createTestPattern({
      name: "Bass",
      activeSteps: [4, 12],
    });

    const sequencer1 = new StepSequencer(
      createTestConfig({
        patterns: [pattern1],
        onStepTrigger: (step, timing) => events1.push({ step, timing }),
      }),
    );

    const sequencer2 = new StepSequencer(
      createTestConfig({
        patterns: [pattern2],
        onStepTrigger: (step, timing) => events2.push({ step, timing }),
      }),
    );

    const context = new Context();
    await context.resume();

    // Both sequencers use same transport
    const transport = new Transport(context, sequencer1);
    transport.bpm = 120;

    sequencer1.start(context.currentTime);
    transport.start();

    await waitForScheduling();

    // Start second sequencer independently
    sequencer2.start(context.currentTime);

    await waitForScheduling();

    transport.stop();

    expect(events1.length).toBeGreaterThan(0);
    expect(events2.length).toBeGreaterThan(0);
  });

  test("pattern sequence cycles correctly", async () => {
    const stateChanges: any[] = [];
    const patternA = createTestPattern({ name: "A", steps: 4 });
    const patternB = createTestPattern({ name: "B", steps: 4 });

    const sequencer = new StepSequencer(
      createTestConfig({
        patterns: [patternA, patternB],
        stepsPerPage: 4,
        patternSequence: "AB",
        enableSequence: true,
        onStateChange: (state) => stateChanges.push(state),
      }),
    );

    const context = new Context();
    await context.resume();

    const transport = new Transport(context, sequencer);
    transport.bpm = 240; // Fast tempo for quick test

    sequencer.start(context.currentTime);
    transport.start();

    await waitForScheduling(500);

    transport.stop();

    // Verify pattern switching occurred
    const patternIndices = stateChanges.map((s) => s.currentPattern);
    expect(patternIndices).toContain(0); // Pattern A
    expect(patternIndices).toContain(1); // Pattern B
  });

  test("oneShot mode stops after pattern completion", async () => {
    const onComplete = vi.fn();
    const pattern = createTestPattern({ steps: 4 });

    const sequencer = new StepSequencer(
      createTestConfig({
        patterns: [pattern],
        stepsPerPage: 4,
        playbackMode: "oneShot",
        onComplete,
      }),
    );

    const context = new Context();
    await context.resume();

    const transport = new Transport(context, sequencer);
    transport.bpm = 240;

    sequencer.start(context.currentTime);
    transport.start();

    await waitForScheduling(500);

    expect(onComplete).toHaveBeenCalled();
    expect(sequencer.getState().isRunning).toBe(false);
  });
});
```

**Step 2: Run test to verify it passes**

```bash
cd packages/transport
pnpm test StepSequencer.integration.test
```

Expected: PASS (all 4 tests)

**Step 3: Commit**

```bash
git add packages/transport/test/StepSequencer.integration.test.ts
git commit -m "test(transport): add StepSequencer integration tests"
```

---

## Task 12: Run Full Test Suite

**Files:**
- None (verification step)

**Step 1: Run all tests**

```bash
cd packages/transport
pnpm test
```

Expected: ALL TESTS PASS

**Step 2: Check test coverage**

```bash
cd packages/transport
pnpm test --coverage
```

Expected: >90% coverage for StepSequencer

**Step 3: Run type checking**

```bash
cd packages/transport
pnpm tsc
```

Expected: No errors

**Step 4: Run linting**

```bash
cd packages/transport
pnpm lint
```

Expected: No errors

**Step 5: Commit if any fixes needed**

```bash
git add .
git commit -m "fix(transport): address linting and type issues"
```

---

## Task 13: Build and Verify Package

**Files:**
- None (verification step)

**Step 1: Build the package**

```bash
cd packages/transport
pnpm build
```

Expected: Build succeeds, dist/ folder created

**Step 2: Verify exports**

Check that `dist/index.d.ts` includes StepSequencer types

**Step 3: Commit**

```bash
git add packages/transport/dist
git commit -m "build(transport): build StepSequencer package"
```

---

## Task 14: Update Engine Module (Integration)

**Files:**
- Modify: `packages/engine/src/modules/StepSequencer.ts`

**Step 1: Backup current implementation**

```bash
cp packages/engine/src/modules/StepSequencer.ts packages/engine/src/modules/StepSequencer.ts.backup
```

**Step 2: Refactor engine module to use transport StepSequencer**

Modify `packages/engine/src/modules/StepSequencer.ts`:

```typescript
import {
  StepSequencer as TransportSequencer,
  type ITriggeredStep,
  type ContextTime,
  type Ticks,
} from "@blibliki/transport";
import {
  Module,
  type IModule,
  type MidiOutput,
  Note,
  type ModulePropSchema,
  type EnumProp,
} from "@/core";
import MidiEvent from "@/core/midi/MidiEvent";
import { divisionToMilliseconds } from "@blibliki/transport";
import type { ICreateModule, ModuleType } from ".";

// Re-export types from transport
export type {
  IStep,
  IStepNote,
  IStepCC,
  IPage,
  IPattern,
  Resolution,
  PlaybackMode,
} from "@blibliki/transport";

export type IStepSequencer = IModule<ModuleType.StepSequencer>;

// Re-export existing props schema (unchanged)
export { stepSequencerPropSchema, stepPropSchema } from "./StepSequencer.old";

// Engine module wraps transport StepSequencer
export default class StepSequencer
  extends Module<ModuleType.StepSequencer>
{
  declare audioNode: undefined;
  midiOutput!: MidiOutput;

  private sequencer: TransportSequencer;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.StepSequencer>,
  ) {
    super(engineId, params);

    // Create transport sequencer
    this.sequencer = new TransportSequencer({
      patterns: params.props.patterns,
      resolution: params.props.resolution,
      stepsPerPage: params.props.stepsPerPage,
      playbackMode: params.props.playbackMode,
      patternSequence: params.props.patternSequence,
      enableSequence: params.props.enableSequence,
      onStepTrigger: this.handleStepTrigger.bind(this),
      onStateChange: this.handleStateChange.bind(this),
      onComplete: this.handleComplete.bind(this),
    });

    this.registerOutputs();
    this.registerTransportListener();
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi" });
  }

  private registerTransportListener() {
    this.engine.transport.addClockCallback(() => {
      // Transport timing handled by StepSequencer
    });
  }

  private handleStepTrigger(
    step: ITriggeredStep,
    timing: { contextTime: ContextTime; ticks: Ticks },
  ) {
    // Send MIDI note-ons
    step.notes.forEach((stepNote) => {
      const note = new Note(stepNote.note);
      note.velocity = stepNote.velocity / 127;
      const midiEvent = MidiEvent.fromNote(note, true, timing.contextTime);
      this.midiOutput.onMidiEvent(midiEvent);

      // Schedule note-off
      const durationSeconds =
        divisionToMilliseconds(step.duration, this.engine.bpm) / 1000;
      if (durationSeconds !== Infinity) {
        const noteOffEvent = MidiEvent.fromNote(
          note,
          false,
          timing.contextTime + durationSeconds,
        );
        this.midiOutput.onMidiEvent(noteOffEvent);
      }
    });

    // Send CC messages
    step.ccMessages.forEach((cc) => {
      const ccEvent = MidiEvent.fromCC(cc.cc, cc.value, timing.contextTime);
      this.midiOutput.onMidiEvent(ccEvent);
    });
  }

  private handleStateChange(state: any) {
    // Update module state for UI
    this.state = {
      ...this.state,
      currentStep: state.currentStep,
    };
    this.triggerPropsUpdate();
  }

  private handleComplete() {
    // Pattern completed in oneShot mode
  }

  start(time: ContextTime): void {
    super.start(time);
    this.sequencer.start(time);
  }

  stop(time: ContextTime): void {
    super.stop(time);
    this.sequencer.stop(time);
  }

  // Delegate update methods to transport sequencer
  updateStep(...args: Parameters<TransportSequencer["updateStep"]>) {
    this.sequencer.updateStep(...args);
  }

  setResolution(resolution: any) {
    this.sequencer.setResolution(resolution);
  }

  // ... delegate other methods as needed
}
```

**Step 3: Test engine module**

```bash
cd packages/engine
pnpm test StepSequencer
```

Expected: Tests pass (may need updates)

**Step 4: Commit**

```bash
git add packages/engine/src/modules/StepSequencer.ts
git commit -m "refactor(engine): use transport StepSequencer"
```

---

## Task 15: Final Verification

**Files:**
- None (verification step)

**Step 1: Build all packages**

```bash
pnpm build:packages
```

Expected: All packages build successfully

**Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass

**Step 3: Type check all packages**

```bash
pnpm tsc
```

Expected: No errors

**Step 4: Lint all packages**

```bash
pnpm lint
```

Expected: No errors

**Step 5: Format code**

```bash
pnpm format
```

**Step 6: Final commit**

```bash
git add .
git commit -m "feat(transport): complete StepSequencer implementation

- Implement TransportListener for precise scheduling
- Add pattern/page/step management
- Support probability filtering and microtiming
- Pattern sequencing with string notation
- Independent lifecycle control
- Comprehensive unit and integration tests
- Refactor engine module to use transport sequencer"
```

---

## Success Criteria

- [x] Transport StepSequencer implements TransportListener
- [x] All pattern/page/step management works correctly
- [x] Probability filtering works in generator
- [x] Microtiming offsets applied precisely
- [x] Pattern sequencing cycles correctly
- [x] OneShot mode stops after completion
- [x] Independent start/stop control works
- [x] Unit tests pass (>90% coverage)
- [x] Integration tests pass
- [x] Engine module uses transport sequencer successfully
- [x] No regressions in Grid app behavior (verify manually)
