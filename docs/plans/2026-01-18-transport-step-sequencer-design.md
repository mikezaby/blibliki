# Transport StepSequencer Design

**Date:** 2026-01-18
**Author:** Design Session
**Status:** Approved

## Overview

Move step sequencer logic from `@blibliki/engine` to `@blibliki/transport` package. This creates a reusable, testable step sequencer with precise scheduling that can be used independently or integrated with the engine.

### Goals

- **Separation of concerns** - Timing/scheduling logic separate from MIDI output
- **Reusability** - Step sequencer usable outside of engine context
- **Clarity** - Clean, understandable implementation
- **Precision** - Robust scheduling with Transport's 200ms lookahead
- **Testability** - Comprehensive unit and integration tests

### Non-Goals

- MIDI output handling (remains in engine module)
- Audio synthesis (not applicable)
- UI components (separate concern)

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────┐
│         StepSequencer                    │
│  implements TransportListener<StepEvent> │
├─────────────────────────────────────────┤
│ • Manages patterns/pages/steps          │
│ • Implements generator() method          │
│ • Implements consumer() method           │
│ • Tracks position & state               │
│ • Filters by probability                │
│ • Applies microtiming offsets           │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│         Transport                        │
│  (with internal Scheduler)               │
├─────────────────────────────────────────┤
│ • 200ms lookahead scheduling            │
│ • Calls generator() for events          │
│ • Schedules events precisely            │
│ • Calls consumer() at trigger time      │
└─────────────────────────────────────────┘
```

The StepSequencer implements `TransportListener<StepEvent>` to integrate with Transport's precision scheduler while maintaining independent lifecycle control.

## Data Structures

### Core Types

```typescript
// Step data (within a page)
interface IStep {
  active: boolean;
  notes: IStepNote[];
  ccMessages: IStepCC[];
  probability: number;      // 0-100
  microtimeOffset: number;  // -100 to +100 (maps to ticks)
  duration: Division;       // "1/16", "1/8", etc.
}

interface IStepNote {
  note: string;    // "C4", "E4", etc.
  velocity: number; // 0-127
}

interface IStepCC {
  cc: number;      // 0-127
  value: number;   // 0-127
}

// Page (collection of steps)
interface IPage {
  name: string;
  steps: IStep[];  // Length determined by stepsPerPage
}

// Pattern (collection of pages)
interface IPattern {
  name: string;    // "A", "B", "C", etc.
  pages: IPage[];
}

// Enums
type Resolution = "1/32" | "1/16" | "1/8" | "1/4";
type PlaybackMode = "loop" | "oneShot";
```

### Configuration

```typescript
interface StepSequencerConfig {
  patterns: IPattern[];
  resolution: Resolution;
  stepsPerPage: number;            // 1-16
  playbackMode: PlaybackMode;
  patternSequence: string;         // "2A4B2AC"
  enableSequence: boolean;
  onStepTrigger: StepTriggerCallback;
  onStateChange?: StateChangeCallback;
  onComplete?: () => void;         // Called when oneShot completes
}
```

### Runtime State

```typescript
interface SequencerState {
  isRunning: boolean;
  currentPattern: number;
  currentPage: number;
  currentStep: number;
  sequencePosition?: string;  // "A (2/4)" for UI
}
```

### Event Types

```typescript
// Event scheduled by generator, consumed by consumer
interface StepEvent extends TransportEvent {
  ticks: Ticks;
  time: ClockTime;
  contextTime: ContextTime;
  step: ITriggeredStep;
  stepIndex: number;
  patternIndex: number;
  pageIndex: number;
}

// Pre-processed step data (probability filtered)
interface ITriggeredStep {
  notes: IStepNote[];      // Ready to send
  ccMessages: IStepCC[];   // Ready to send
  duration: Division;      // Note duration
}

// Callback signature
type StepTriggerCallback = (
  step: ITriggeredStep,
  timing: { contextTime: ContextTime; ticks: Ticks }
) => void;

type StateChangeCallback = (state: SequencerState) => void;
```

## Generator/Consumer Implementation

### Generator Method

The generator creates events for the lookahead window, applying probability filtering and microtiming offsets:

```typescript
generator(startTicks: Ticks, endTicks: Ticks): readonly StepEvent[] {
  if (!this.state.isRunning) return [];

  const events: StepEvent[] = [];
  const stepTicks = this.getStepTicksForResolution();

  // Calculate which steps fall in this tick window
  const firstStepNo = Math.ceil(startTicks / stepTicks);
  const lastStepNo = Math.floor(endTicks / stepTicks);

  for (let globalStepNo = firstStepNo; globalStepNo <= lastStepNo; globalStepNo++) {
    // Determine pattern/page/step indices
    const { patternIndex, pageIndex, stepIndex } =
      this.resolveStepPosition(globalStepNo);

    const step = this.getStep(patternIndex, pageIndex, stepIndex);
    if (!step.active) continue;

    // Filter by probability (baked into scheduling)
    if (Math.random() * 100 > step.probability) continue;

    // Calculate tick position with microtiming offset applied
    const baseTicks = globalStepNo * stepTicks;
    const offsetTicks = this.calculateMicrotimingOffset(step.microtimeOffset);
    const eventTicks = baseTicks + offsetTicks;

    // Create triggered step (only notes/CCs that will fire)
    const triggeredStep: ITriggeredStep = {
      notes: [...step.notes],
      ccMessages: [...step.ccMessages],
      duration: step.duration
    };

    events.push({
      ticks: eventTicks,
      time: 0,  // Filled by Transport
      contextTime: 0,  // Filled by Transport
      step: triggeredStep,
      stepIndex,
      patternIndex,
      pageIndex
    });
  }

  return events;
}
```

**Key decisions:**
- Probability filtering happens in generator (committed at schedule time)
- Microtiming offset applied to ticks in generator (Transport converts to contextTime)
- Only active steps with passing probability checks generate events

### Consumer Method

The consumer receives scheduled events and triggers the callback:

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
    ticks: event.ticks
  });
}
```

## Position Tracking

### Position Resolution

```typescript
private resolveStepPosition(globalStepNo: number): {
  patternIndex: number;
  pageIndex: number;
  stepIndex: number;
} {
  // In sequence mode, pattern changes at pattern boundaries
  const patternIndex = this.config.enableSequence
    ? this.resolveSequencePattern(globalStepNo)
    : this.currentPatternIndex;

  const pattern = this.config.patterns[patternIndex];
  const totalSteps = pattern.pages.length * this.config.stepsPerPage;

  // Normalize to pattern-local step number
  const localStepNo = globalStepNo % totalSteps;

  const pageIndex = Math.floor(localStepNo / this.config.stepsPerPage);
  const stepIndex = localStepNo % this.config.stepsPerPage;

  return { patternIndex, pageIndex, stepIndex };
}
```

### Pattern Sequencing

Pattern sequence notation (e.g., "2A4B2AC") is expanded to an array:

```typescript
// "2A4B2AC" → ["A", "A", "B", "B", "B", "B", "A", "A", "C"]
private expandPatternSequence(sequence: string): string[] {
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
    for (let j = 0; j < count; j++) {
      expanded.push(patternName);
    }
    i++;
  }

  return expanded;
}
```

The sequencer cycles through the expanded sequence, switching patterns at pattern boundaries.

## Lifecycle Management

### Independent Control

The StepSequencer has independent `start()` and `stop()` methods:

```typescript
// Start sequencer at specific context time
start(contextTime: ContextTime): void {
  if (this.state.isRunning) return;

  this.state = {
    ...this.state,
    isRunning: true
  };

  this.startTicks = this.getCurrentTransportTicks();
  this.resetInternalTracking();

  this.config.onStateChange?.(this.state);
}

// Stop sequencer at specific context time
stop(contextTime: ContextTime): void {
  if (!this.state.isRunning) return;

  this.state = {
    ...this.state,
    isRunning: false
  };

  this.resetInternalTracking();
  this.config.onStateChange?.(this.state);
}

// Reset to beginning
reset(): void {
  this.state = {
    isRunning: false,
    currentPattern: 0,
    currentPage: 0,
    currentStep: 0,
    sequencePosition: undefined
  };

  this.sequencePatternCount = 0;
  this.startTicks = 0;
  this.resetInternalTracking();

  this.config.onStateChange?.(this.state);
}
```

### TransportListener Hooks

The TransportListener lifecycle hooks are no-ops to maintain independence:

```typescript
// No-ops for independent control
onStart(contextTime: ContextTime): void {}
onStop(contextTime: ContextTime): void {}
onJump(ticks: Ticks): void {}
silence(contextTime: ContextTime): void {}
```

**Rationale:** The engine or app layer provides glue code to coordinate Transport and StepSequencer lifecycles as needed. This keeps the sequencer reusable and testable in isolation.

### OneShot Mode

When `playbackMode` is "oneShot", the sequencer stops after completing the pattern:

```typescript
private checkPatternCompletion(event: StepEvent): void {
  const currentPattern = this.config.patterns[this.state.currentPattern];
  const totalSteps = currentPattern.pages.length * this.config.stepsPerPage;
  const globalStepNo = this.calculateGlobalStepNo(event.ticks);

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

## Mutable Update API

All updates mutate internal state directly:

```typescript
class StepSequencer {
  // Step updates
  updateStep(
    patternIndex: number,
    pageIndex: number,
    stepIndex: number,
    changes: Partial<IStep>
  ): void;

  // Pattern management
  addPattern(pattern: IPattern): void;
  removePattern(index: number): void;
  setActivePattern(index: number): void;

  // Page management
  addPage(patternIndex: number, page: IPage): void;
  removePage(patternIndex: number, pageIndex: number): void;

  // Configuration
  setResolution(resolution: Resolution): void;
  setPlaybackMode(mode: PlaybackMode): void;
  setStepsPerPage(count: number): void;
  setPatternSequence(sequence: string): void;
  setEnableSequence(enabled: boolean): void;

  // State queries
  getState(): SequencerState;
  getStep(patternIndex: number, pageIndex: number, stepIndex: number): IStep;
  getPattern(index: number): IPattern;
  getPage(patternIndex: number, pageIndex: number): IPage;
}
```

Updates trigger `onStateChange` callback if the change affects runtime state.

## Testing Strategy

### Unit Tests

Test individual components in isolation:

- **Data Management**
  - `updateStep` modifies step data correctly
  - `addPattern` / `removePattern` manage pattern array
  - `setResolution` updates tick calculations

- **Pattern Sequencing**
  - `expandPatternSequence` parses notation correctly
  - `resolveSequencePattern` cycles through sequence
  - Pattern switching at boundaries

- **Position Tracking**
  - `resolveStepPosition` calculates indices correctly
  - Multi-page patterns
  - Edge cases (boundaries, wrapping)

- **Probability Filtering**
  - Probability 0 never triggers
  - Probability 100 always triggers
  - Intermediate probabilities (mock Math.random)

- **Microtiming**
  - Positive offset delays event ticks
  - Negative offset advances event ticks
  - Offset calculation matches spec

### Integration Tests

Test with actual Transport instance:

- **Scheduling Precision**
  - Events scheduled with correct lookahead
  - `contextTime` precision for events
  - Microtiming offsets applied correctly

- **Playback Modes**
  - Loop mode continues indefinitely
  - OneShot mode stops after pattern completion
  - `onComplete` callback fires correctly

- **Multiple Sequencers**
  - Multiple sequencers on one transport
  - Independent start/stop
  - No event conflicts

- **State Changes**
  - `onStateChange` fires on position updates
  - State accurately reflects current position
  - Pattern sequence position formatting

### Test Utilities

Helper functions for test setup:

```typescript
function createTestPattern(steps: number = 16): IPattern;
function createTestConfig(overrides?: Partial<StepSequencerConfig>): StepSequencerConfig;
async function waitForScheduling(ms: number = 250): Promise<void>;
```

## Engine Integration

### Engine Module Changes

The engine's `StepSequencer` module becomes a thin wrapper:

```typescript
// packages/engine/src/modules/StepSequencer.ts
import { StepSequencer as TransportSequencer } from '@blibliki/transport';

export default class StepSequencer extends Module {
  private sequencer: TransportSequencer;
  midiOutput!: MidiOutput;

  constructor(engineId: string, params: ICreateModule) {
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
      onComplete: this.handleComplete.bind(this)
    });

    this.registerOutputs();
    this.registerTransportListener();
  }

  private handleStepTrigger(step: ITriggeredStep, timing: TimingParams) {
    // Send MIDI note-ons
    step.notes.forEach(stepNote => {
      const note = new Note(stepNote.note);
      note.velocity = stepNote.velocity / 127;
      const midiEvent = MidiEvent.fromNote(note, true, timing.contextTime);
      this.midiOutput.onMidiEvent(midiEvent);

      // Schedule note-off
      if (step.duration !== Infinity) {
        const durationSeconds = divisionToMilliseconds(step.duration, this.engine.bpm) / 1000;
        const noteOffEvent = MidiEvent.fromNote(note, false, timing.contextTime + durationSeconds);
        this.midiOutput.onMidiEvent(noteOffEvent);
      }
    });

    // Send CC messages
    step.ccMessages.forEach(cc => {
      const ccEvent = MidiEvent.fromCC(cc.cc, cc.value, timing.contextTime);
      this.midiOutput.onMidiEvent(ccEvent);
    });
  }

  // Glue code: coordinate transport and sequencer
  private registerTransportListener() {
    this.engine.transport.onStart = (contextTime) => {
      if (this.shouldStartWithTransport) {
        this.sequencer.start(contextTime);
      }
    };
  }
}
```

### Glue Code Pattern

For coordinating transport and sequencer:

```typescript
// In engine or app layer
transport.addPropertyChangeCallback('state', (state, contextTime) => {
  if (state === TransportState.playing) {
    drumSequencer.start(contextTime);
    bassSequencer.start(contextTime);
  } else {
    drumSequencer.stop(contextTime);
    bassSequencer.stop(contextTime);
  }
});
```

## File Structure

```
packages/transport/
├── src/
│   ├── StepSequencer.ts         # Main class
│   ├── types.ts                 # Type definitions
│   └── index.ts                 # Exports
├── test/
│   ├── StepSequencer.test.ts    # Unit tests
│   └── integration.test.ts      # Integration tests
```

## Migration Strategy

1. **Implement in transport package**
   - Create types and interfaces
   - Implement StepSequencer class
   - Write unit tests
   - Write integration tests

2. **Update engine module**
   - Refactor to use transport StepSequencer
   - Keep MIDI output logic
   - Add glue code for coordination

3. **Verify behavior**
   - Run engine tests
   - Test in Grid app
   - Verify no regressions

## Open Questions

None - design is complete and approved.

## Success Criteria

- [ ] Transport StepSequencer implements TransportListener
- [ ] All pattern/page/step management works correctly
- [ ] Probability filtering works in generator
- [ ] Microtiming offsets applied precisely
- [ ] Pattern sequencing cycles correctly
- [ ] OneShot mode stops after completion
- [ ] Independent start/stop control works
- [ ] Unit tests pass (>90% coverage)
- [ ] Integration tests pass
- [ ] Engine module uses transport sequencer successfully
- [ ] No regressions in Grid app behavior
