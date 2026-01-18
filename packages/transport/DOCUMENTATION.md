# @blibliki/transport Documentation

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [The Scheduler: Deep Dive](#the-scheduler-deep-dive)
4. [Architecture & Component Interaction](#architecture--component-interaction)
5. [Time Systems](#time-systems)
6. [Getting Started](#getting-started)
7. [Complete Examples](#complete-examples)
8. [API Reference](#api-reference)

---

## Overview

**@blibliki/transport** is a precision timing engine for music applications built on the Web Audio API. It solves the fundamental challenge of synchronizing musical events (notes, beats) with the browser's high-precision audio context clock.

### What Does It Do?

- Converts music time (bars, beats, ticks) into audio context time (seconds)
- Schedules events with sample-accurate precision
- Handles tempo changes, swing, and complex timing scenarios
- Provides a clean architecture for building sequencers, metronomes, and music players

### Key Features

- **Precision Scheduling**: Uses a sliding window approach to schedule events ahead of playback
- **Multiple Time Systems**: Seamlessly converts between transport time (musical ticks), clock time (pauseable), and context time (continuous)
- **Flexible Architecture**: Generator/consumer callback system for event generation and consumption
- **Minimal Dependencies**: Lightweight library focused purely on timing and scheduling

---

## Core Concepts

### 1. The Three Time Systems

This library manages three distinct time coordinate systems:

```
┌──────────────────────────────────────────────────────────────┐
│                    CONTEXT TIME                               │
│  - Always running, never pauses                              │
│  - Source: WebAudio audioContext.currentTime                 │
│  - Units: Seconds (continuous)                               │
│  - Precision: Audio sample resolution (~44,100 Hz)           │
└──────────────────────────────────────────────────────────────┘
                            ↑
                            │ Clock.clockTimeToContextTime()
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      CLOCK TIME                               │
│  - Pauses when Transport stops                               │
│  - Offset from context time                                  │
│  - Units: Seconds (pauseable)                                │
│  - Used for scheduling window management                     │
└──────────────────────────────────────────────────────────────┘
                            ↑
                            │ Tempo.getTicks() / Tempo.getClockTime()
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    TRANSPORT TIME (TICKS)                     │
│  - Musical timeline (bars, beats, subdivisions)              │
│  - Units: Ticks (15,360 ticks per beat)                      │
│  - Where sequencer events live                               │
│  - Affected by tempo (BPM)                                   │
└──────────────────────────────────────────────────────────────┘
```

**Why Three Time Systems?**

1. **Context Time**: Web Audio requires absolute timestamps that never pause
2. **Clock Time**: We need a pauseable timeline for start/stop functionality
3. **Transport Time (Ticks)**: Musicians think in bars and beats, not seconds

### 2. The Scheduling Window

The scheduler maintains a sliding time window:

```
Past Events              Scheduling Window              Future Events
(consumed)               (actively managed)             (not yet generated)
   │                     │                    │                 │
   ├─────────────────────┼────────────────────┼─────────────────┤
                         ↑                    ↑
                   consumedTime        consumedTime +
                                      scheduleAheadTime
```

**How It Works:**

- **Left Edge**: `consumedTime` - events up to here have been played
- **Right Edge**: `consumedTime + scheduleAheadTime` - events up to here have been generated
- **Window Size**: Typically 200ms (configurable)
- **Update Rate**: Every 20ms (configurable)

As time advances:

1. Generate new events for the right edge
2. Consume/play events that reach the left edge
3. Clean up consumed events from memory

### 3. Event Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         TRANSPORT                            │
│  (Orchestrates timing, converts time systems)               │
└─────────────────────────────────────────────────────────────┘
         │                                          ↑
         │ Request events                           │ Schedule with
         │ (in ticks)                               │ context time
         ↓                                          │
┌─────────────────────────────────────────────────────────────┐
│                         GENERATOR                            │
│  (User-provided callback function)                          │
│  Returns: Array<{ ticks, ...customData }>                  │
└─────────────────────────────────────────────────────────────┘
                                                     ↓
┌─────────────────────────────────────────────────────────────┐
│                       SCHEDULER                              │
│  - Applies swing transformation                             │
│  - Converts ticks → clock time → context time              │
│  - Stores in Timeline                                       │
│  - Consumes events at right time                            │
└─────────────────────────────────────────────────────────────┘
                                                     ↓
┌─────────────────────────────────────────────────────────────┐
│                         CONSUMER                             │
│  (User-provided callback function)                          │
│  Receives: { ticks, time, contextTime, ...customData }     │
│  Schedules Web Audio nodes at contextTime                   │
└─────────────────────────────────────────────────────────────┘
```

---

## The Scheduler: Deep Dive

The Scheduler is the heart of the timing system. Let's understand it in detail.

### Source Code Analysis

```typescript
export class Scheduler<T extends TimelineEvent = TimelineEvent> {
  private _timeline = new Timeline<T>();
  private _scheduleAheadTime: Seconds;
  private _consumedTime: Seconds;
  private _generator: EventGenerator<T>;
  private _consumer: EventConsumer<T>;

  constructor(
    generator: EventGenerator<T>,
    consumer: EventConsumer<T>,
    scheduleAheadTime: Seconds,
  ) {
    this._generator = generator;
    this._consumer = consumer;
    this._scheduleAheadTime = scheduleAheadTime;
    this._consumedTime = -this._scheduleAheadTime; // Start negative!
  }
}
```

**Key Design Decisions:**

1. **Initial Consumed Time**: `-scheduleAheadTime`
   - Ensures the first `runUntil(0)` call generates events from 0 to scheduleAheadTime
   - Creates the initial scheduling window

2. **Generic Type `<T>`**: Works with any event type that has a `time` property
   - Flexible: Can schedule MIDI events, automation events, etc.

### The `runUntil()` Method

This is called every 20ms by the Transport's timer:

```typescript
runUntil(time: Seconds) {
  if (time <= this._consumedTime) {
    throw new Error('Scheduling time is <= current time');
  }

  // STEP 1: Generate new events
  // Generate events between the old and new right edges
  this._schedule(
    this._consumedTime + this._scheduleAheadTime,
    time + this._scheduleAheadTime
  );

  // STEP 2: Consume ready events
  // Find events between old and new left edges
  const events = this._timeline.find(this._consumedTime, time);
  this._consumer(events);
  this._consumedTime = time;

  // STEP 3: Clean up
  // Remove consumed events from timeline
  this._timeline.removeAllBefore(this._consumedTime);
}
```

### Visual Example

Let's trace through a real scenario:

**Initial State** (time = 0):

```
consumedTime = -0.2 (negative!)
scheduleAheadTime = 0.2

Scheduling window: [-0.2, 0.0]
No events yet
```

**First `runUntil(0)`:**

```
Generate events from: -0.2 + 0.2 = 0.0  to  0.0 + 0.2 = 0.2
Consume events from:  -0.2  to  0.0
Update consumedTime to 0.0

Scheduling window now: [0.0, 0.2]
Timeline contains: events from 0.0 to 0.2
```

**Next `runUntil(0.02)` (20ms later):**

```
Generate events from: 0.0 + 0.2 = 0.2  to  0.02 + 0.2 = 0.22
Consume events from:  0.0  to  0.02
Update consumedTime to 0.02

Scheduling window now: [0.02, 0.22]
Timeline contains: events from 0.02 to 0.22
Consumed: events from 0.0 to 0.02 (played!)
```

### The `jumpTo()` Method

Used when seeking to a new position:

```typescript
jumpTo(time: Seconds) {
  this._timeline.clear();  // Discard all scheduled events
  this._consumedTime = time - this._scheduleAheadTime;
}
```

**Why `time - scheduleAheadTime`?**

- Sets up the scheduling window to start at the jump destination
- The next `runUntil()` will generate events from the new position

**Example:**

```
Jump to time = 5.0
consumedTime = 5.0 - 0.2 = 4.8

Next runUntil(5.0) will generate events from 5.0 to 5.2
```

### Event Generator & Consumer Callbacks

**Generator Signature:**

```typescript
type EventGenerator<T> = (
  start: ClockTime,
  end: ClockTime,
) => readonly Readonly<T>[];
```

Example implementation:

```typescript
function generateKickDrumEvents(start: ClockTime, end: ClockTime) {
  const events = [];
  // Find all kick drum hits in the time range
  for (let time = Math.ceil(start); time < end; time += 0.5) {
    events.push({
      time: time,
      note: 36, // MIDI note for kick
      velocity: 100,
    });
  }
  return events;
}
```

**Consumer Signature:**

```typescript
type EventConsumer<T> = (events: readonly Readonly<T>[]) => void;
```

Example implementation:

```typescript
function consumeMidiEvents(events: readonly Readonly<MidiEvent>[]) {
  events.forEach((event) => {
    // Schedule a Web Audio node to play at event.contextTime
    const source = audioContext.createBufferSource();
    source.buffer = kickDrumSample;
    source.connect(audioContext.destination);
    source.start(event.contextTime);
  });
}
```

### Scheduler Performance Characteristics

**Time Complexity:**

- `runUntil()`: O(n) where n = number of events generated + consumed in the interval
- `jumpTo()`: O(m) where m = number of events currently in timeline

**Space Complexity:**

- O(k) where k = number of events in the scheduling window
- Typical: 200ms window × 4 notes per second = ~1 event in memory
- Dense sequences: 200ms window × 32nd notes at 120 BPM = ~3 events

**Why It's Efficient:**

- Only generates events when needed (lazy evaluation)
- Automatically cleans up consumed events
- Fixed memory footprint regardless of song length

---

## Architecture & Component Interaction

### The Transport Class

The Transport is the main orchestrator. Here's how it integrates all components:

**Initialization Flow:**

```typescript
// In Transport.ts constructor
constructor(context: Context, listener: TransportListener<T>) {
  const SCHEDULE_INTERVAL_MS = 20;        // How often to check time
  const SCHEDULE_WINDOW_SIZE_MS = 200;    // How far ahead to schedule

  this.context = context;
  this.listener = listener;
  this.clock = new Clock(this.context, SCHEDULE_WINDOW_SIZE_MS / 1000);

  // Create scheduler with bound methods
  this.scheduler = new Scheduler<T>(
    this.generateEvents,  // Generator
    this.consumeEvents,   // Consumer
    SCHEDULE_WINDOW_SIZE_MS / 1000
  );

  // Create timer that calls scheduler
  this.timer = new Timer(() => {
    const time = this.clock.time();
    const contextTime = this.clock.clockTimeToContextTime(time);
    const ticks = this.tempo.getTicks(time);
    if (time <= this.clockTime) return;

    this.clockTime = time;
    this.scheduler.runUntil(time);  // THE MAGIC HAPPENS HERE
    this._clockCallbacks.forEach((callback) => {
      callback(this.clockTime, contextTime, ticks);
    });
  }, SCHEDULE_INTERVAL_MS / 1000);
}
```

**Transport's Event Generation:**

```typescript
private generateEvents = (
  start: ClockTime,
  end: ClockTime,
): readonly Readonly<T>[] => {
  // 1. Convert clock time → ticks
  const transportStart = this.tempo.getTicks(start);
  const transportEnd = this.tempo.getTicks(end);

  // 2. Ask listener for events in ticks
  return this.listener
    .generator(transportStart, transportEnd)
    .map((event) => {
      // 3. Apply swing (modifies ticks)
      return {
        ...event,
        ticks: swing(event.ticks, this.swingAmount),
      };
    })
    .map((event) => {
      // 4. Convert back: ticks → clock time → context time
      const time = this.tempo.getClockTime(event.ticks);
      const contextTime = this.clock.clockTimeToContextTime(time);
      return {
        ...event,
        time,
        contextTime,
      };
    });
};
```

**Complete Timing Flow:**

```
1. Timer fires (every 20ms)
   ↓
2. Transport gets current clock time
   ↓
3. If time advanced:
   ├─ Call scheduler.runUntil(newTime)
   │  ├─ Call generateEvents(start, end)  [clock time]
   │  │  ├─ Convert to ticks
   │  │  ├─ Call listener.generator()
   │  │  ├─ Get events in ticks
   │  │  ├─ Apply swing
   │  │  └─ Convert to context time
   │  ├─ Add events to Timeline
   │  ├─ Find events to consume
   │  ├─ Call consumeEvents(events)
   │  │  └─ Call listener.consumer() for each event
   │  └─ Clean up consumed events
   └─ Fire clock callbacks
```

### The Clock Class

Manages the relationship between pauseable clock and continuous context time:

```typescript
export class Clock {
  private clockTimeAtStart: ClockTime = 0;
  private contextTimeAtStart: ContextTime = 0;
  private _isRunning = false;

  time(): ClockTime {
    if (this._isRunning) {
      const now = this.context.currentTime; // audioContext.currentTime
      return this.clockTimeAtStart + (now - this.contextTimeAtStart);
    }
    return this.clockTimeAtStop;
  }

  start(contextTime: ContextTime) {
    this.contextTimeAtStart = contextTime;
    this.clockTimeAtStart = this.clockTimeAtStop; // Resume from where we stopped
    this._isRunning = true;
  }

  clockTimeToContextTime(clockTime: ClockTime): ContextTime {
    if (!this._isRunning) {
      return (
        this.contextClockOffset +
        this.contextTimeAtStop +
        clockTime -
        this.clockTimeAtStop
      );
    }
    return (
      this.contextClockOffset +
      this.contextTimeAtStart +
      clockTime -
      this.clockTimeAtStart
    );
  }
}
```

**Key Insight**: The Clock maintains reference points (start/stop times) to calculate current position without constantly querying the audio context.

### The Tempo Class

Handles tempo (BPM) and converts between ticks and seconds:

```typescript
export class Tempo {
  private clockTimeAtLastTempoChange = 0;
  private ticksAtLastTempoChange = 0;
  private _bpm = 120;

  getTicks(clockTime: ClockTime): Ticks {
    const clockDelta = clockTime - this.clockTimeAtLastTempoChange;
    const tickDelta = clockDelta * ticksPerSecond(this._bpm);
    return Math.floor(this.ticksAtLastTempoChange + tickDelta);
  }

  getClockTime(ticks: Ticks): ClockTime {
    const tickDelta = Math.floor(ticks - this.ticksAtLastTempoChange);
    const clockDelta = tickDelta * secondsPerTick(this._bpm);
    return this.clockTimeAtLastTempoChange + clockDelta;
  }

  update(clockTime: ClockTime, bpm: BPM) {
    // Record current position before changing tempo
    this.ticksAtLastTempoChange = this.getTicks(clockTime);
    this.clockTimeAtLastTempoChange = clockTime;
    this._bpm = bpm;
  }
}
```

**Conversion Formulas:**

```typescript
// At 120 BPM:
const TPB = 15360; // Ticks per beat

function ticksPerSecond(bpm: number): number {
  return (bpm / 60) * TPB;
  // 120 BPM = 2 beats/sec × 15360 = 30,720 ticks/sec
}

function secondsPerTick(bpm: number): number {
  return 60 / bpm / TPB;
  // 120 BPM = 60 / 120 / 15360 = 0.0000326 sec/tick
}
```

**Example Conversion:**

```typescript
// Convert bar 1, beat 1, to ticks:
const ticks = 0;  // Bar 0, beat 0

// Convert bar 2, beat 2, to ticks:
const ticks = 1 * 4 * TPB + 1 * TPB;
// = 4 beats + 1 beat = 5 beats = 76,800 ticks

// At 120 BPM, 1 beat = 0.5 seconds
// 5 beats = 2.5 seconds
```

---

## Time Systems

### Transport Time: Ticks

**Why 15,360 ticks per beat?**

This number is carefully chosen:

- Divisible by: 2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 30, 32, ...
- Supports common time divisions: whole, half, quarter, eighth, sixteenth, thirty-second notes
- Supports triplets: 1/4 note triplet = 5,120 ticks
- Supports quintuplets, sextuplets, etc.

**Common Time Values:**

| Musical Value | Ticks  | At 120 BPM (seconds) |
| ------------- | ------ | -------------------- |
| 1 bar (4/4)   | 61,440 | 2.0                  |
| 1 beat        | 15,360 | 0.5                  |
| 1/8 note      | 7,680  | 0.25                 |
| 1/16 note     | 3,840  | 0.125                |
| 1/32 note     | 1,920  | 0.0625               |
| 1/8 triplet   | 5,120  | ~0.167               |

### Position Format

```typescript
interface TPosition {
  bars: number;       // 0-indexed
  beats: number;      // 0-indexed
  sixteenths: number; // 0-indexed
}

// Example: Bar 2, Beat 3, Sixteenth 1
{ bars: 1, beats: 2, sixteenths: 1 }

// String notation: "bars:beats:sixteenths"
type TStringPosition = `${number}:${number}:${number}`;
```

**The Position Class:**

```typescript
import { Position } from "@blibliki/transport";

// Create from ticks
const pos1 = new Position(76800, [4, 4]); // Creates "1:0:0"

// Create from string notation
const pos2 = new Position("2:1:3", [4, 4]);

// Create from object
const pos3 = new Position({ bars: 2, beats: 1, sixteenths: 3 }, [4, 4]);

// Access properties
console.log(pos2.ticks); // Get ticks
console.log(pos2.bars); // Get bars
console.log(pos2.beats); // Get beats
console.log(pos2.sixteenths); // Get sixteenths
console.log(pos2.toString()); // Get string "2:1:3"
```

---

## Getting Started

### Basic Setup

```typescript
import { Transport, TransportEvent, TPB } from "@blibliki/transport";
import { Context } from "@blibliki/utils";

// 1. Define your event type
interface ClickEvent extends TransportEvent {
  accent: boolean;
}

// 2. Create audio context wrapper
const context = new Context();

// 3. Create transport with generator and consumer
const transport = new Transport<ClickEvent>(context, {
  generator: (startTicks, endTicks) => {
    const events: ClickEvent[] = [];
    const SIXTEENTH = TPB / 4; // TPB = 15360 ticks per beat

    // Quantize to sixteenths
    let tick = Math.ceil(startTicks / SIXTEENTH) * SIXTEENTH;

    while (tick < endTicks) {
      const step = Math.round(tick / SIXTEENTH);
      events.push({
        ticks: tick,
        time: 0, // Filled by Transport
        contextTime: 0, // Filled by Transport
        accent: step % 4 === 0,
      });
      tick += SIXTEENTH;
    }

    return events;
  },
  consumer: (event) => {
    // Schedule Web Audio node to play at event.contextTime
    const osc = context.audioContext.createOscillator();
    const gain = context.audioContext.createGain();

    osc.frequency.setValueAtTime(event.accent ? 1200 : 800, event.contextTime);
    gain.gain.setValueAtTime(event.accent ? 0.6 : 0.3, event.contextTime);
    gain.gain.exponentialRampToValueAtTime(0.001, event.contextTime + 0.05);

    osc.connect(gain).connect(context.destination);
    osc.start(event.contextTime);
    osc.stop(event.contextTime + 0.05);
  },
  onStart: (contextTime) => {
    console.log("Transport started at", contextTime);
  },
  onStop: (contextTime) => {
    console.log("Transport stopped at", contextTime);
  },
  onJump: (ticks) => {
    console.log("Jumped to", ticks, "ticks");
  },
  silence: (contextTime) => {
    // Stop any playing sounds
  },
});

// 4. Initialize and start (must be triggered by user gesture)
async function init() {
  await context.resume(); // Resume AudioContext (browser requirement)
  transport.bpm = 120;
  transport.start();
}

// 5. Control playback
transport.start(); // Start playback
transport.stop(); // Stop playback
transport.reset(); // Reset to beginning
```

### Browser AudioContext Requirements

Modern browsers require user interaction to create/resume AudioContext:

```typescript
// Hook into user click event
button.addEventListener("click", async () => {
  await context.resume(); // Resume the audio context
  transport.start(); // Start playback
});
```

---

## Complete Examples

### Example 1: Simple Metronome

This demonstrates the core timing concepts:

```typescript
import { Transport, TransportEvent, TPB } from "@blibliki/transport";
import { Context } from "@blibliki/utils";

// 1. Define event type
interface MetronomeEvent extends TransportEvent {
  accent: boolean;
}

// 2. Create context
const context = new Context();

// 3. Create transport with metronome logic
const transport = new Transport<MetronomeEvent>(context, {
  // Generator: Create events in ticks
  generator(startTicks, endTicks) {
    const events: MetronomeEvent[] = [];

    // Find the first beat in this range
    const firstBeat = Math.ceil(startTicks / TPB);
    const lastBeat = Math.floor(endTicks / TPB);

    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      events.push({
        ticks: beat * TPB,
        accent: beat % 4 === 0, // Accent every 4th beat
        time: 0, // Will be filled by Transport
        contextTime: 0, // Will be filled by Transport
      });
    }

    return events;
  },

  // Consumer: Play events using Web Audio
  consumer(event) {
    console.log(`Playing beat at ${event.contextTime}, accent:${event.accent}`);

    // Create oscillator for click sound
    const osc = context.audioContext.createOscillator();
    const gain = context.audioContext.createGain();

    osc.frequency.setValueAtTime(event.accent ? 1000 : 800, event.contextTime);
    gain.gain.setValueAtTime(0.3, event.contextTime);
    gain.gain.exponentialRampToValueAtTime(0.001, event.contextTime + 0.05);

    osc.connect(gain).connect(context.destination);
    osc.start(event.contextTime);
    osc.stop(event.contextTime + 0.05);
  },

  // Lifecycle hooks
  onStart(contextTime) {
    console.log("Transport started at", contextTime);
  },
  onStop(contextTime) {
    console.log("Transport stopped at", contextTime);
  },
  onJump(ticks) {
    console.log(`Jumped to ${ticks} ticks`);
  },
  silence(contextTime) {
    console.log("Silencing all notes");
  },
});

// 4. Initialize and start (requires user gesture)
async function start() {
  await context.resume();
  transport.bpm = 120; // 120 BPM
  transport.start();
}
```

**What Happens:**

```
Timer fires at t=0:
  scheduler.runUntil(0)
    Generate events from 0 to 0.2 seconds
    → Transport converts to ticks: 0 to ~6,144 ticks
    → generator() called with (0, 6144)
    → Returns event at tick 0 (first beat)
    → Transport converts back to context time
    → Event scheduled at contextTime ~0.2

Timer fires at t=0.02:
  scheduler.runUntil(0.02)
    Generate events from 0.2 to 0.22 seconds
    Consume events from 0 to 0.02 seconds
    → consumer() called for beat at tick 0
    → "Playing beat at 0.2" logged

At t=0.2:
  Web Audio plays the scheduled sound
```

### Example 2: Step Sequencer

A practical step sequencer with 16 steps:

```typescript
import { Transport, TransportEvent, TPB } from "@blibliki/transport";
import { Context } from "@blibliki/utils";

interface SequencerEvent extends TransportEvent {
  note: number;
  velocity: number;
}

// Step pattern: true = play, false = rest
const kickPattern = [
  true,
  false,
  false,
  false, // Steps 0-3
  true,
  false,
  false,
  false, // Steps 4-7
  true,
  false,
  false,
  false, // Steps 8-11
  true,
  false,
  false,
  false, // Steps 12-15
];

const snarePattern = [
  false,
  false,
  false,
  false,
  true,
  false,
  false,
  false, // Snare on step 4
  false,
  false,
  false,
  false,
  true,
  false,
  false,
  false, // Snare on step 12
];

const context = new Context();
const SIXTEENTH = TPB / 4;

const transport = new Transport<SequencerEvent>(context, {
  generator(startTicks, endTicks) {
    const events: SequencerEvent[] = [];

    // Find which sixteenth notes fall in this range
    const firstStep = Math.ceil(startTicks / SIXTEENTH);
    const lastStep = Math.floor(endTicks / SIXTEENTH);

    for (let step = firstStep; step <= lastStep; step++) {
      const stepIndex = step % 16;
      const ticks = step * SIXTEENTH;

      // Check kick pattern
      if (kickPattern[stepIndex]) {
        events.push({
          ticks,
          note: 36, // MIDI note for kick
          velocity: 100,
          time: 0,
          contextTime: 0,
        });
      }

      // Check snare pattern
      if (snarePattern[stepIndex]) {
        events.push({
          ticks,
          note: 38, // MIDI note for snare
          velocity: 110,
          time: 0,
          contextTime: 0,
        });
      }
    }

    return events;
  },

  consumer(event) {
    // Play appropriate sound based on note
    const osc = context.audioContext.createOscillator();
    const gain = context.audioContext.createGain();

    // Different frequencies for kick vs snare
    const freq = event.note === 36 ? 60 : 200;
    osc.frequency.setValueAtTime(freq, event.contextTime);
    gain.gain.setValueAtTime((event.velocity / 127) * 0.5, event.contextTime);
    gain.gain.exponentialRampToValueAtTime(0.001, event.contextTime + 0.1);

    osc.connect(gain).connect(context.destination);
    osc.start(event.contextTime);
    osc.stop(event.contextTime + 0.1);
  },

  onStart: () => console.log("Sequencer started"),
  onStop: () => console.log("Sequencer stopped"),
  onJump: () => console.log("Sequencer jumped"),
  silence: () => console.log("Silence"),
});

// Start it up
async function start() {
  await context.resume();
  transport.bpm = 120;
  transport.start();
}
```

### Example 3: Understanding Scheduler Timing

Let's trace exact timings for a 120 BPM metronome:

```typescript
// Setup
const BPM = 120;
const SCHEDULE_INTERVAL = 0.02; // 20ms
const SCHEDULE_AHEAD_TIME = 0.2; // 200ms
const TICKS_PER_BEAT = 15360;

// At 120 BPM:
// - 1 beat = 0.5 seconds
// - 1 tick = 0.5 / 15360 = 0.0000326 seconds

// Initial state
let consumedTime = -0.2;
let audioTime = 0.0;

// === FIRST TIMER TICK (t=0) ===
console.log("Timer tick at audio time 0.0");

// runUntil(0.0)
// Generate from: -0.2 + 0.2 = 0.0  to  0.0 + 0.2 = 0.2
// Transport converts: 0.0-0.2 seconds → 0-6144 ticks
// generator(0, 6144) returns:
//   - Event at tick 0 (beat 0, time 0.0)
// Transport converts back:
//   - tick 0 → clock time 0.0 → audio time 0.2
// Timeline now contains: [{ note: 60, audioClockTime: 0.2 }]

// Consume from: -0.2 to 0.0 → No events
// consumedTime = 0.0

// === SECOND TIMER TICK (t=0.02) ===
console.log("Timer tick at audio time 0.02");

// runUntil(0.02)
// Generate from: 0.2 to 0.22 → No new beats
// Consume from: 0.0 to 0.02 → No events in this range
// consumedTime = 0.02

// === TENTH TIMER TICK (t=0.18) ===
console.log("Timer tick at audio time 0.18");

// runUntil(0.18)
// Generate from: 0.38 to 0.4 → No new beats
// Consume from: 0.16 to 0.18 → No events
// consumedTime = 0.18

// === ELEVENTH TIMER TICK (t=0.20) ===
console.log("Timer tick at audio time 0.20");

// runUntil(0.20)
// Generate from: 0.4 to 0.42 → No new beats
// Consume from: 0.18 to 0.20
//   → Event at audio time 0.2 is consumed!
//   → consumer() called, plays the sound
// consumedTime = 0.20

// AT THIS EXACT MOMENT:
// Web Audio system plays the scheduled note at time 0.2

// === TIMER TICK AT t=0.50 (first beat boundary) ===
// Generate from: 0.7 to 0.72
// Transport converts: 0.7-0.72 sec → ~21,504-22,118 ticks
// generator(21504, 22118) returns:
//   - No events (next beat is at tick 15360 = 0.5 sec)
// Wait, this already happened earlier!

// Let me recalculate...
// At t=0.28:
// Generate from: 0.48 to 0.5
// → 14,746-15,360 ticks
// generator(14746, 15360) returns:
//   - Event at tick 15360 (beat 1)
// Convert: tick 15360 → 0.5 sec clock → 0.7 sec audio
// Timeline: [{ note: 60, audioClockTime: 0.7 }]
```

---

## API Reference

### Transport

**Constructor:**

```typescript
new Transport<T extends TransportEvent>(
  context: Context,
  listener: TransportListener<T>
)
```

**Playback Control:**

```typescript
transport.start(): void         // Start playback
transport.stop(): void          // Stop playback
transport.reset(): void         // Reset to position 0
```

**Position:**

```typescript
transport.position: Position    // Get/set current position

// Example:
transport.position = new Position("2:1:0", [4, 4]);  // Jump to bar 2, beat 1
```

**Tempo:**

```typescript
transport.bpm: number           // Get/set tempo (BPM)

// Example:
transport.bpm = 140;
```

**Time Signature:**

```typescript
transport.timeSignature: TimeSignature  // Get/set time signature

// Example:
transport.timeSignature = [3, 4];  // 3/4 time
```

**Swing:**

```typescript
transport.swingAmount: NormalRange  // Get/set swing (0.5 = none, 0.75 = max)

// Example:
transport.swingAmount = 0.6;  // Light swing
```

**State:**

```typescript
transport.state: TransportState  // "playing" | "stopped" | "paused"
```

**Callbacks:**

```typescript
transport.addClockCallback(
  (clockTime: ClockTime, contextTime: ContextTime, ticks: Ticks) => void
): void

transport.addBarCallback((bar: number) => void): void

transport.addPropertyChangeCallback(
  property: TransportProperty,
  callback: (value: unknown, contextTime: ContextTime) => void
): void
```

### TransportListener Interface

```typescript
interface TransportListener<T extends TransportEvent> {
  // Generate events in ticks
  generator(start: Ticks, end: Ticks): readonly Readonly<T>[];

  // Consume individual events (with contextTime already set)
  consumer(event: Readonly<T>): void;

  // Lifecycle
  onStart(contextTime: ContextTime): void;
  onStop(contextTime: ContextTime): void;
  onJump(ticks: Ticks): void;
  silence(contextTime: ContextTime): void; // Stop all currently playing sounds
}
```

### TransportEvent Interface

```typescript
interface TransportEvent extends TimelineEvent {
  ticks: Ticks; // Musical time
  contextTime: ContextTime; // Audio context time
}

// Extend this for your custom events:
interface MyEvent extends TransportEvent {
  note: number;
  velocity: number;
  // ... other custom properties
}
```

### Position Class

**Constructor:**

```typescript
new Position(
  value: Ticks | TStringPosition | TPosition,
  timeSignature: TimeSignature
)
```

**Properties:**

```typescript
position.ticks: Ticks
position.bars: number
position.beats: number
position.sixteenths: number
position.toString(): string  // Returns "bars:beats:sixteenths"
```

**Example:**

```typescript
const pos1 = new Position(76800, [4, 4]);
const pos2 = new Position("2:1:3", [4, 4]);
const pos3 = new Position({ bars: 2, beats: 1, sixteenths: 3 }, [4, 4]);

console.log(pos2.ticks); // 92160
console.log(pos2.toString()); // "2:1:3"
```

### Utility Functions

**TPB** (Ticks Per Beat):

```typescript
import { TPB } from "@blibliki/transport";

// TPB = 15360
```

**Division Helpers:**

```typescript
import {
  divisionToTicks,
  divisionToFrequency,
  divisionToMilliseconds,
} from "@blibliki/transport";

// Convert musical divisions to ticks
const eighthNoteTicks = divisionToTicks("1/8", 120);

// Convert divisions to frequency (Hz)
const eighthNoteFreq = divisionToFrequency("1/8", 120);

// Convert divisions to milliseconds
const eighthNoteMs = divisionToMilliseconds("1/8", 120);
```

---

## Advanced Topics

### Swing Implementation

Swing shifts the timing of off-beats:

```typescript
export function swing(time: Ticks, swingAmount: NormalRange): Ticks {
  const EIGHTH_NOTE_TICKS = TPB / 2;
  const swingTime = (swingAmount - 0.5) * 2; // Map 0.5-0.75 to 0-0.5

  // Find position within the eighth note
  const phase = (time / EIGHTH_NOTE_TICKS) % 1;
  const eighthNoteIndex = Math.floor(time / EIGHTH_NOTE_TICKS);

  let offset = 0;
  if (phase > 0 && phase < 0.5) {
    // First half: expand
    offset = phase * EIGHTH_NOTE_TICKS * swingTime;
  } else if (phase >= 0.5) {
    // Second half: compress
    offset =
      (0.5 + (phase - 0.5) * (1 - swingTime)) * EIGHTH_NOTE_TICKS -
      phase * EIGHTH_NOTE_TICKS;
  }

  return Math.floor(
    eighthNoteIndex * EIGHTH_NOTE_TICKS + phase * EIGHTH_NOTE_TICKS + offset,
  );
}

// Usage:
transport.swingAmount = 0.6; // Set swing (0.5 = none, 0.75 = max)
```

### Tempo Changes

The Tempo class supports changing BPM mid-playback:

```typescript
// Simply set the BPM property
transport.bpm = 140;

// Internally, the Transport does:
set bpm(bpm: BPM) {
  const oldBpm = this.tempo.bpm;
  this.tempo.update(this.clockTime, bpm);  // Records current position

  // Trigger property change callbacks if BPM actually changed
  if (oldBpm !== bpm) {
    this.triggerPropertyChange("bpm", bpm);
  }
}
```

This ensures smooth transitions without time jumps - the current musical position is preserved.

### Performance Optimization

**Scheduler Window Sizing:**

- Larger window (e.g., 500ms): More stable, higher latency
- Smaller window (e.g., 100ms): Lower latency, more CPU
- Default 200ms is a good balance

**Timer Interval:**

- Smaller interval (e.g., 10ms): More responsive, more CPU
- Larger interval (e.g., 50ms): Less CPU, less precise
- Default 20ms provides good responsiveness

---

## Troubleshooting

### Events Don't Play

**Check initialization:**

```typescript
await context.resume(); // Must be called after user interaction
```

**Check consumer callback:**

```typescript
consumer(event) {
  // Make sure you're actually scheduling audio!
  console.log("Event:", event);
  // ... schedule Web Audio nodes at event.contextTime
}
```

### Timing Drift

The scheduler automatically corrects for JavaScript timer imprecision by:

1. Using Web Audio's high-precision clock as reference
2. Scheduling events ahead of playback (200ms lookahead)
3. Checking time every 20ms and catching up if needed

### Audio Context Suspended

Modern browsers suspend audio contexts by default. Always call `context.resume()` in response to user interaction:

```typescript
button.addEventListener("click", async () => {
  await context.resume();
  transport.start();
});
```

### Generator Returns Duplicate Events

The generator may be called with overlapping time windows when rescheduling. Make sure your generator is idempotent:

```typescript
// WRONG: May return duplicates
let eventCounter = 0;
generator(start, end) {
  return [{ ticks: eventCounter++ * TPB, time: 0, contextTime: 0 }];
}

// CORRECT: Based only on the time window
generator(start, end) {
  const events = [];
  const firstBeat = Math.ceil(start / TPB);
  const lastBeat = Math.floor(end / TPB);
  for (let beat = firstBeat; beat <= lastBeat; beat++) {
    events.push({ ticks: beat * TPB, time: 0, contextTime: 0 });
  }
  return events;
}
```

---

## Summary

The @blibliki/transport library provides:

1. **Precision Timing**: Sample-accurate event scheduling via the Scheduler's sliding window
2. **Clean Architecture**: Separation between generation (callbacks), timing (Transport), and consumption (callbacks)
3. **Flexible Time Systems**: Seamless conversion between musical time (ticks), clock time, and context time
4. **Essential Features**: Swing, tempo changes, time signatures, position management, and callbacks

The Scheduler is the core innovation - it maintains a buffer of pre-scheduled events, allowing JavaScript's imprecise timers to coexist with Web Audio's precision requirements.

The library is intentionally minimal and focused on timing/scheduling - audio generation, MIDI handling, and sample playback are left to the consumer to implement as needed.
