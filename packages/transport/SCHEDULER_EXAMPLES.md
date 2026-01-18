# Scheduler Examples & Deep Dive

This document provides hands-on examples specifically focused on understanding and using the Scheduler component.

## Table of Contents

1. [Scheduler Fundamentals](#scheduler-fundamentals)
2. [Example 1: Minimal Scheduler](#example-1-minimal-scheduler)
3. [Example 2: Visual Scheduler Simulation](#example-2-visual-scheduler-simulation)
4. [Example 3: Building a Step Sequencer](#example-3-building-a-step-sequencer)
5. [Example 4: Dynamic Event Generation](#example-4-dynamic-event-generation)
6. [Example 5: Multi-Track Scheduling](#example-5-multi-track-scheduling)
7. [Advanced Patterns](#advanced-patterns)

---

## Scheduler Fundamentals

### What Problem Does the Scheduler Solve?

JavaScript timers (`setTimeout`, `setInterval`) are imprecise:

```javascript
// Problem: This won't play exactly every 500ms
setInterval(() => {
  playSound();
}, 500);
// Actual timing: 502ms, 498ms, 505ms, 497ms... (drift over time)
```

Web Audio API requires precise timestamps:

```javascript
// Web Audio needs: "Play this sound at EXACTLY 1.250 seconds"
source.start(audioContext.currentTime + 1.25);
```

**The Scheduler bridges this gap:**

```
Imprecise JavaScript Timer (20ms)
        ↓
Check time frequently
        ↓
Generate events AHEAD OF TIME (200ms buffer)
        ↓
Schedule in Web Audio with PRECISE timestamps
        ↓
Perfect timing!
```

### The Scheduling Window Concept

```
Timeline: ─────────────────────────────────────────────────→
                    ↑                    ↑
              consumedTime         consumedTime +
              (0.50 sec)          scheduleAheadTime
                                       (0.70 sec)

Events before 0.50: Already played, cleaned up
Events 0.50-0.70:   In the window, ready to play
Events after 0.70:  Not yet generated
```

**Key Operations:**

1. **Generate**: Create events for future time range
2. **Consume**: Play events whose time has arrived
3. **Cleanup**: Remove events that have already played

---

## Example 1: Minimal Scheduler

Let's build the simplest possible scheduler to understand the mechanics:

```typescript
// Minimal types
interface SimpleEvent {
  time: number; // When to play (in seconds)
  note: number; // What to play
}

// Minimal scheduler implementation
class MinimalScheduler {
  private events: SimpleEvent[] = [];
  private consumedTime = 0;
  private scheduleAheadTime = 0.2; // 200ms lookahead

  constructor(
    private generator: (start: number, end: number) => SimpleEvent[],
    private consumer: (event: SimpleEvent) => void,
  ) {}

  runUntil(newTime: number) {
    console.log(`\n=== runUntil(${newTime.toFixed(2)}) ===`);
    console.log(`Previous consumedTime: ${this.consumedTime.toFixed(2)}`);

    // STEP 1: Generate new events
    const generateStart = this.consumedTime + this.scheduleAheadTime;
    const generateEnd = newTime + this.scheduleAheadTime;

    console.log(
      `Generating events: ${generateStart.toFixed(2)} to ${generateEnd.toFixed(2)}`,
    );
    const newEvents = this.generator(generateStart, generateEnd);
    this.events.push(...newEvents);
    this.events.sort((a, b) => a.time - b.time);
    console.log(
      `Added ${newEvents.length} events. Total events: ${this.events.length}`,
    );

    // STEP 2: Consume events
    const eventsToPlay = this.events.filter(
      (e) => e.time >= this.consumedTime && e.time < newTime,
    );
    console.log(`Consuming ${eventsToPlay.length} events`);
    eventsToPlay.forEach((e) => {
      console.log(`  → Playing note ${e.note} at time ${e.time.toFixed(2)}`);
      this.consumer(e);
    });

    // STEP 3: Cleanup
    this.events = this.events.filter((e) => e.time >= newTime);
    this.consumedTime = newTime;
    console.log(`Events remaining: ${this.events.length}`);
  }

  jumpTo(time: number) {
    this.events = [];
    this.consumedTime = time;
  }
}

// Example usage: Schedule a beat every 0.5 seconds
function generateBeats(start: number, end: number): SimpleEvent[] {
  const events: SimpleEvent[] = [];
  const BEAT_INTERVAL = 0.5; // 120 BPM (0.5 sec per beat)

  // Find first beat after start
  const firstBeat = Math.ceil(start / BEAT_INTERVAL) * BEAT_INTERVAL;

  for (let time = firstBeat; time < end; time += BEAT_INTERVAL) {
    events.push({
      time: time,
      note: 60, // Middle C
    });
  }

  return events;
}

function consumeBeat(event: SimpleEvent) {
  // In real code, this would schedule Web Audio
  console.log(`    ♪ PLAY NOTE ${event.note}`);
}

// Simulate the scheduler running
const scheduler = new MinimalScheduler(generateBeats, consumeBeat);

// Initial state: consumedTime = 0
console.log("Initial state:");
console.log("consumedTime:", 0);
console.log("scheduleAheadTime:", 0.2);

// Simulate timer ticks
scheduler.runUntil(0.0); // Time 0
scheduler.runUntil(0.02); // +20ms
scheduler.runUntil(0.04); // +20ms
scheduler.runUntil(0.06); // +20ms
// ... continue until beat plays
scheduler.runUntil(0.5); // First beat consumed here!
scheduler.runUntil(0.52);
```

**Expected Output:**

```
Initial state:
consumedTime: 0
scheduleAheadTime: 0.2

=== runUntil(0.00) ===
Previous consumedTime: 0.00
Generating events: 0.20 to 0.20
Added 0 events. Total events: 0
Consuming 0 events
Events remaining: 0

=== runUntil(0.02) ===
Previous consumedTime: 0.00
Generating events: 0.20 to 0.22
Added 0 events. Total events: 0
Consuming 0 events
Events remaining: 0

=== runUntil(0.04) ===
Previous consumedTime: 0.02
Generating events: 0.22 to 0.24
Added 0 events. Total events: 0
Consuming 0 events
Events remaining: 0

...

=== runUntil(0.28) ===
Previous consumedTime: 0.26
Generating events: 0.48 to 0.50
Added 1 events. Total events: 1  ← Beat at 0.5 generated!
  Event: { time: 0.5, note: 60 }
Consuming 0 events
Events remaining: 1

...

=== runUntil(0.50) ===
Previous consumedTime: 0.48
Generating events: 0.68 to 0.70
Added 1 events. Total events: 2
Consuming 1 events  ← Beat at 0.5 consumed!
  → Playing note 60 at time 0.50
    ♪ PLAY NOTE 60
Events remaining: 1
```

**Key Insights:**

1. Events are generated 200ms BEFORE they play
2. Events are consumed when their time arrives
3. The scheduler window slides forward continuously

---

## Example 2: Visual Scheduler Simulation

This example shows the scheduler's state at each step:

```typescript
class VisualScheduler {
  private timeline: Map<number, string[]> = new Map();
  private consumedTime = 0;
  private currentTime = 0;
  private scheduleAheadTime = 0.2;

  generateEvent(time: number, label: string) {
    const roundedTime = Math.round(time * 100) / 100;
    if (!this.timeline.has(roundedTime)) {
      this.timeline.set(roundedTime, []);
    }
    this.timeline.get(roundedTime)!.push(label);
  }

  tick(deltaTime: number) {
    this.currentTime += deltaTime;

    // Generate events
    const generateStart = this.consumedTime + this.scheduleAheadTime;
    const generateEnd = this.currentTime + this.scheduleAheadTime;

    // For demo: generate a beat every 0.5 seconds
    const firstBeat = Math.ceil(generateStart / 0.5) * 0.5;
    for (let beat = firstBeat; beat < generateEnd; beat += 0.5) {
      this.generateEvent(beat, `Beat${Math.round(beat * 2)}`);
    }

    // Consume events
    const consumed: string[] = [];
    for (const [time, events] of this.timeline.entries()) {
      if (time >= this.consumedTime && time < this.currentTime) {
        consumed.push(...events.map((e) => `${e}@${time.toFixed(2)}`));
        this.timeline.delete(time);
      }
    }

    this.consumedTime = this.currentTime;

    // Visualize
    this.visualize(consumed);
  }

  visualize(consumed: string[]) {
    const width = 60;
    const scale = width / (this.scheduleAheadTime * 2);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Time: ${this.currentTime.toFixed(3)}s`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Timeline visualization
    const line: string[] = new Array(width).fill("─");
    const windowStart = this.consumedTime;
    const windowEnd = this.consumedTime + this.scheduleAheadTime;

    // Mark window boundaries
    line[0] = "┤";
    const windowEndPos = Math.floor(this.scheduleAheadTime * scale);
    if (windowEndPos < width) {
      line[windowEndPos] = "├";
    }

    // Mark events
    for (const [time, events] of this.timeline.entries()) {
      const relativeTime = time - windowStart;
      const pos = Math.floor(relativeTime * scale);
      if (pos >= 0 && pos < width) {
        line[pos] = "●";
      }
    }

    console.log("Timeline: " + line.join(""));
    console.log("          ┤" + "─".repeat(windowEndPos - 1) + "├");
    console.log("       Consumed            Scheduled");
    console.log("         Edge              Ahead Edge");
    console.log(
      `       (${windowStart.toFixed(2)}s)              (${windowEnd.toFixed(2)}s)`,
    );

    // Show scheduled events
    console.log(`\nScheduled Events (${this.timeline.size}):`);
    const sortedEvents = Array.from(this.timeline.entries()).sort(
      (a, b) => a[0] - b[0],
    );
    sortedEvents.forEach(([time, events]) => {
      console.log(`  ${time.toFixed(2)}s: ${events.join(", ")}`);
    });

    // Show consumed events
    if (consumed.length > 0) {
      console.log(`\n🔊 Just Played: ${consumed.join(", ")}`);
    }
  }

  run(duration: number, tickSize: number) {
    const ticks = Math.ceil(duration / tickSize);
    for (let i = 0; i < ticks; i++) {
      this.tick(tickSize);
      // In real life, this would be triggered by setInterval
    }
  }
}

// Run simulation
const sim = new VisualScheduler();
sim.run(1.0, 0.1); // Run for 1 second, tick every 100ms
```

**Sample Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0.000s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: ┤────────────────────────────────────────────────────────├
          ┤───────────────────────────────────────────────────────├
       Consumed            Scheduled
         Edge              Ahead Edge
       (0.00s)              (0.20s)

Scheduled Events (0):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0.100s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: ┤────────────────────────────────────────────────────────├
          ┤───────────────────────────────────────────────────────├
       Consumed            Scheduled
         Edge              Ahead Edge
       (0.10s)              (0.30s)

Scheduled Events (0):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0.200s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: ┤────────────────────────────────────────────────────────├
          ┤───────────────────────────────────────────────────────├
       Consumed            Scheduled
         Edge              Ahead Edge
       (0.20s)              (0.40s)

Scheduled Events (0):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0.300s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: ┤─────────────────────────────●──────────────────────────├
          ┤───────────────────────────────────────────────────────├
       Consumed            Scheduled
         Edge              Ahead Edge
       (0.30s)              (0.50s)

Scheduled Events (1):
  0.50s: Beat1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0.400s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: ┤───────────●────────────────────────────────────────────├
          ┤───────────────────────────────────────────────────────├
       Consumed            Scheduled
         Edge              Ahead Edge
       (0.40s)              (0.60s)

Scheduled Events (1):
  0.50s: Beat1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: 0.500s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timeline: ┤────────────────────────────────────────────────────────├
          ┤───────────────────────────────────────────────────────├
       Consumed            Scheduled
         Edge              Ahead Edge
       (0.50s)              (0.70s)

Scheduled Events (0):

🔊 Just Played: Beat1@0.50
```

---

## Example 3: Building a Step Sequencer

Let's build a practical 16-step drum sequencer using the scheduler:

```typescript
interface DrumStep {
  enabled: boolean;
  velocity: number; // 0-127
}

interface DrumPattern {
  name: string;
  steps: DrumStep[]; // 16 steps
  note: number; // MIDI note
}

class StepSequencer {
  private patterns: Map<string, DrumPattern> = new Map();
  private stepsPerBar = 16;
  private bpm = 120;

  addPattern(pattern: DrumPattern) {
    this.patterns.set(pattern.name, pattern);
  }

  // This is the generator function for the scheduler
  generate(startTicks: number, endTicks: number): MidiEvent[] {
    const events: MidiEvent[] = [];
    const TPB = 15360;
    const ticksPerStep = (4 * TPB) / this.stepsPerBar;

    // Find which steps fall in this time range
    const firstStep = Math.ceil(startTicks / ticksPerStep);
    const lastStep = Math.floor(endTicks / ticksPerStep);

    for (let step = firstStep; step <= lastStep; step++) {
      const stepIndex = step % this.stepsPerBar;
      const ticks = step * ticksPerStep;

      // Check each pattern
      for (const pattern of this.patterns.values()) {
        const drumStep = pattern.steps[stepIndex];

        if (drumStep.enabled) {
          events.push({
            ticks: ticks,
            note: pattern.note,
            velocity: drumStep.velocity,
            time: 0, // Filled by Transport
            contextTime: 0, // Filled by Transport
          });
        }
      }
    }

    return events;
  }
}

// Example: Create a basic drum pattern
const sequencer = new StepSequencer();

// Kick drum pattern: hits on steps 0, 4, 8, 12
const kickPattern: DrumPattern = {
  name: "kick",
  note: 36, // MIDI note for kick
  steps: [
    { enabled: true, velocity: 100 }, // Step 0
    { enabled: false, velocity: 0 }, // Step 1
    { enabled: false, velocity: 0 }, // Step 2
    { enabled: false, velocity: 0 }, // Step 3
    { enabled: true, velocity: 100 }, // Step 4
    { enabled: false, velocity: 0 }, // Step 5
    { enabled: false, velocity: 0 }, // Step 6
    { enabled: false, velocity: 0 }, // Step 7
    { enabled: true, velocity: 100 }, // Step 8
    { enabled: false, velocity: 0 }, // Step 9
    { enabled: false, velocity: 0 }, // Step 10
    { enabled: false, velocity: 0 }, // Step 11
    { enabled: true, velocity: 100 }, // Step 12
    { enabled: false, velocity: 0 }, // Step 13
    { enabled: false, velocity: 0 }, // Step 14
    { enabled: false, velocity: 0 }, // Step 15
  ],
};

// Snare pattern: hits on steps 4, 12
const snarePattern: DrumPattern = {
  name: "snare",
  note: 38, // MIDI note for snare
  steps: [
    { enabled: false, velocity: 0 }, // Step 0
    { enabled: false, velocity: 0 }, // Step 1
    { enabled: false, velocity: 0 }, // Step 2
    { enabled: false, velocity: 0 }, // Step 3
    { enabled: true, velocity: 110 }, // Step 4 ← Snare!
    { enabled: false, velocity: 0 }, // Step 5
    { enabled: false, velocity: 0 }, // Step 6
    { enabled: false, velocity: 0 }, // Step 7
    { enabled: false, velocity: 0 }, // Step 8
    { enabled: false, velocity: 0 }, // Step 9
    { enabled: false, velocity: 0 }, // Step 10
    { enabled: false, velocity: 0 }, // Step 11
    { enabled: true, velocity: 110 }, // Step 12 ← Snare!
    { enabled: false, velocity: 0 }, // Step 13
    { enabled: false, velocity: 0 }, // Step 14
    { enabled: false, velocity: 0 }, // Step 15
  ],
};

// Hi-hat pattern: hits on every other step
const hihatPattern: DrumPattern = {
  name: "hihat",
  note: 42, // MIDI note for closed hi-hat
  steps: Array.from({ length: 16 }, (_, i) => ({
    enabled: i % 2 === 0,
    velocity: i % 4 === 0 ? 90 : 70, // Accent every 4th step
  })),
};

sequencer.addPattern(kickPattern);
sequencer.addPattern(snarePattern);
sequencer.addPattern(hihatPattern);

// Use with Transport
const listener: TransportListener<MidiEvent> = {
  generator: (start, end) => sequencer.generate(start, end),
  consumer: (event) => {
    console.log(
      `Play note ${event.note} vel ${event.velocity} at ${event.contextTime.toFixed(3)}`,
    );
    // In real code: sampler.playNote(event.note, event.contextTime, event.velocity);
  },
  onStart: () => console.log("Sequencer started"),
  onStop: () => console.log("Sequencer stopped"),
  onJump: () => console.log("Sequencer jumped"),
  silence: () => console.log("Silence all"),
};

// Connect to transport
const transport = new Transport(lifetime, listener);
transport.setTempo(120);
transport.start();
```

**Expected Pattern:**

```
Bar 1:
Step  0: Kick + Hi-hat (accent)
Step  1: -
Step  2: Hi-hat
Step  3: -
Step  4: Kick + Snare + Hi-hat (accent)
Step  5: -
Step  6: Hi-hat
Step  7: -
Step  8: Kick + Hi-hat (accent)
Step  9: -
Step 10: Hi-hat
Step 11: -
Step 12: Kick + Snare + Hi-hat (accent)
Step 13: -
Step 14: Hi-hat
Step 15: -
```

**Modifying Patterns in Real-Time:**

```typescript
// Enable a step
function enableStep(patternName: string, stepIndex: number, velocity: number) {
  const pattern = sequencer.patterns.get(patternName);
  if (pattern) {
    pattern.steps[stepIndex] = { enabled: true, velocity };
  }
}

// Disable a step
function disableStep(patternName: string, stepIndex: number) {
  const pattern = sequencer.patterns.get(patternName);
  if (pattern) {
    pattern.steps[stepIndex] = { enabled: false, velocity: 0 };
  }
}

// Example: Add extra hi-hats
enableStep("hihat", 1, 50);
enableStep("hihat", 3, 50);
// Now hi-hats play on EVERY step!
```

---

## Example 4: Dynamic Event Generation

Sometimes you want to generate events algorithmically or respond to external input:

```typescript
class DynamicSequencer {
  private density = 0.5; // 0.0 to 1.0
  private randomSeed = 12345;

  // Seeded random number generator (for reproducibility)
  private random() {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }

  setDensity(density: number) {
    this.density = Math.max(0, Math.min(1, density));
  }

  generate(startTicks: number, endTicks: number): MidiEvent[] {
    const events: MidiEvent[] = [];
    const TPB = 15360;
    const TICKS_PER_SIXTEENTH = TPB / 4;

    // Generate on sixteenth note grid
    const firstSixteenth = Math.ceil(startTicks / TICKS_PER_SIXTEENTH);
    const lastSixteenth = Math.floor(endTicks / TICKS_PER_SIXTEENTH);

    for (let i = firstSixteenth; i <= lastSixteenth; i++) {
      // Probabilistic event generation
      if (this.random() < this.density) {
        const ticks = i * TICKS_PER_SIXTEENTH;
        const note = 60 + Math.floor(this.random() * 12); // Random note C-B
        const velocity = 70 + Math.floor(this.random() * 30); // Random velocity

        events.push({
          ticks,
          note,
          velocity,
          time: 0,
          contextTime: 0,
        });
      }
    }

    return events;
  }
}

// Usage
const dynSeq = new DynamicSequencer();

// Start sparse
dynSeq.setDensity(0.2);
transport.start();

// Gradually increase density
let currentDensity = 0.2;
setInterval(() => {
  currentDensity += 0.1;
  if (currentDensity > 1.0) currentDensity = 0.2;
  dynSeq.setDensity(currentDensity);
  console.log(`Density: ${(currentDensity * 100).toFixed(0)}%`);
}, 2000);
```

**Output Pattern:**

```
Time 0-2s:   Density 20% → Sparse notes
Time 2-4s:   Density 30% → A bit more
Time 4-6s:   Density 40% → Getting busier
Time 6-8s:   Density 50% → Half filled
Time 8-10s:  Density 60% → Dense
Time 10-12s: Density 70% → Very dense
Time 12-14s: Density 80% → Almost full
Time 14-16s: Density 90% → Nearly all notes
Time 16-18s: Density 100% → Every sixteenth
Time 18-20s: Density 20% → Back to sparse
```

---

## Example 5: Multi-Track Scheduling

The scheduler can handle multiple tracks efficiently:

```typescript
interface Track {
  name: string;
  pattern: number[]; // MIDI notes
  subdivision: number; // 1=quarter, 2=eighth, 4=sixteenth
  offset: number; // Delay in ticks
  enabled: boolean;
}

class MultiTrackSequencer {
  private tracks: Track[] = [];

  addTrack(track: Track) {
    this.tracks.push(track);
  }

  removeTrack(name: string) {
    this.tracks = this.tracks.filter((t) => t.name !== name);
  }

  generate(startTicks: number, endTicks: number): MidiEvent[] {
    const events: MidiEvent[] = [];
    const TPB = 15360;

    for (const track of this.tracks) {
      if (!track.enabled) continue;

      const ticksPerNote = (TPB * 4) / track.subdivision / track.pattern.length;

      // Calculate which notes in the pattern fall in this range
      const firstNoteIndex = Math.ceil(
        (startTicks - track.offset) / ticksPerNote,
      );
      const lastNoteIndex = Math.floor(
        (endTicks - track.offset) / ticksPerNote,
      );

      for (let i = firstNoteIndex; i <= lastNoteIndex; i++) {
        if (i < 0) continue;

        const patternIndex = i % track.pattern.length;
        const note = track.pattern[patternIndex];

        if (note > 0) {
          // 0 means rest
          const ticks = i * ticksPerNote + track.offset;

          if (ticks >= startTicks && ticks < endTicks) {
            events.push({
              ticks,
              note,
              velocity: 100,
              time: 0,
              contextTime: 0,
            });
          }
        }
      }
    }

    return events;
  }
}

// Example: Create a multi-track arrangement
const multiSeq = new MultiTrackSequencer();

// Bass line (quarter notes)
multiSeq.addTrack({
  name: "bass",
  pattern: [36, 36, 43, 41], // C, C, G, F
  subdivision: 1, // Quarter notes
  offset: 0,
  enabled: true,
});

// Melody (eighth notes)
multiSeq.addTrack({
  name: "melody",
  pattern: [60, 62, 64, 65, 67, 65, 64, 62], // C major scale up and down
  subdivision: 2, // Eighth notes
  offset: 0,
  enabled: true,
});

// Hi-hat (sixteenth notes)
multiSeq.addTrack({
  name: "hihat",
  pattern: [42, 42, 42, 42], // Closed hi-hat
  subdivision: 4, // Sixteenth notes
  offset: 0,
  enabled: true,
});

// Delayed arp (sixteenth notes, offset by 1/32)
multiSeq.addTrack({
  name: "arp",
  pattern: [72, 76, 79, 76], // High arpeggio
  subdivision: 4,
  offset: TPB / 8, // Offset by 1/32 note
  enabled: true,
});

// Mute/unmute tracks
function muteTrack(name: string) {
  const track = multiSeq.tracks.find((t) => t.name === name);
  if (track) track.enabled = false;
}

function unmuteTrack(name: string) {
  const track = multiSeq.tracks.find((t) => t.name === name);
  if (track) track.enabled = true;
}

// Example: Mute bass temporarily
setTimeout(() => muteTrack("bass"), 4000);
setTimeout(() => unmuteTrack("bass"), 8000);
```

---

## Advanced Patterns

### Pattern 1: Event Buffering for Low-Latency

If you need ultra-low latency, reduce the schedule ahead time but increase update frequency:

```typescript
// Standard: 200ms lookahead, 20ms updates
const transport = new Transport(lifetime, listener);

// Low latency: 50ms lookahead, 5ms updates
// (Modify transport.ts constructor)
const SCHEDULE_INTERVAL_MS = 5;
const SCHEDULE_WINDOW_SIZE_MS = 50;
```

**Trade-offs:**

- Lower latency: 50ms vs 200ms
- Higher CPU usage: 200 updates/sec vs 50 updates/sec
- Less stability: Smaller margin for JavaScript timer jitter

### Pattern 2: Tempo Automation

```typescript
class TempoAutomation {
  private targetTempo = 120;
  private currentTempo = 120;
  private rampDuration = 4; // seconds
  private rampStartTime = 0;

  setTempoRamp(from: number, to: number, duration: number, startTime: number) {
    this.currentTempo = from;
    this.targetTempo = to;
    this.rampDuration = duration;
    this.rampStartTime = startTime;
  }

  getTempoAt(time: number): number {
    if (time < this.rampStartTime) {
      return this.currentTempo;
    }

    const elapsed = time - this.rampStartTime;
    if (elapsed >= this.rampDuration) {
      return this.targetTempo;
    }

    const progress = elapsed / this.rampDuration;
    return (
      this.currentTempo + (this.targetTempo - this.currentTempo) * progress
    );
  }

  // Call this in a clock callback
  updateTransport(transport: Transport, time: number) {
    const newTempo = this.getTempoAt(time);
    transport.setTempo(newTempo);
  }
}

// Usage
const tempoAuto = new TempoAutomation();
tempoAuto.setTempoRamp(120, 140, 8, 0); // 120→140 BPM over 8 seconds

transport.addClockCallback((time) => {
  tempoAuto.updateTransport(transport, time);
});
```

### Pattern 3: Lookahead Event Modification

Sometimes you want to modify events after generation but before consumption:

```typescript
class EventModifier {
  private modifiers: Array<(event: MidiEvent) => MidiEvent> = [];

  addModifier(fn: (event: MidiEvent) => MidiEvent) {
    this.modifiers.push(fn);
  }

  apply(events: MidiEvent[]): MidiEvent[] {
    return events.map((event) => {
      let modified = event;
      for (const modifier of this.modifiers) {
        modified = modifier(modified);
      }
      return modified;
    });
  }
}

// Example modifiers
const modifier = new EventModifier();

// Humanize: Add random timing variations
modifier.addModifier((event) => ({
  ...event,
  ticks: event.ticks + (Math.random() - 0.5) * 100, // ±100 ticks
}));

// Velocity randomization
modifier.addModifier((event) => ({
  ...event,
  velocity: Math.max(
    1,
    Math.min(127, event.velocity + (Math.random() - 0.5) * 20),
  ),
}));

// Transpose
modifier.addModifier((event) => ({
  ...event,
  note: event.note + 12, // Up one octave
}));

// Apply in generator
function generate(start: Ticks, end: Ticks): MidiEvent[] {
  const rawEvents = baseSequencer.generate(start, end);
  return modifier.apply(rawEvents);
}
```

### Pattern 4: MIDI Recording

Capture live MIDI input and quantize to the scheduler grid:

```typescript
class MIDIRecorder {
  private recordedNotes: MidiEvent[] = [];
  private recording = false;
  private recordStartTime = 0;

  startRecording(transport: Transport) {
    this.recording = true;
    this.recordStartTime = transport.getPosition();
    this.recordedNotes = [];
  }

  stopRecording() {
    this.recording = false;
    return this.recordedNotes;
  }

  captureNote(note: number, velocity: number, transport: Transport) {
    if (!this.recording) return;

    const currentTicks = positionToTicks(transport.getPosition(), 4);

    this.recordedNotes.push({
      ticks: currentTicks,
      note,
      velocity,
      time: 0,
      contextTime: 0,
    });
  }

  quantize(subdivision: number) {
    const TPB = 15360;
    const quantizeGrid = TPB / subdivision;

    this.recordedNotes = this.recordedNotes.map((event) => ({
      ...event,
      ticks: Math.round(event.ticks / quantizeGrid) * quantizeGrid,
    }));
  }
}

// Usage
const recorder = new MIDIRecorder();

// Start recording
recorder.startRecording(transport);

// Capture MIDI input (pseudocode)
midiInput.onNote((note, velocity) => {
  recorder.captureNote(note, velocity, transport);
});

// Stop and quantize
setTimeout(() => {
  const recorded = recorder.stopRecording();
  recorder.quantize(4); // Quantize to sixteenth notes
  console.log(`Recorded ${recorded.length} notes`);
}, 8000);
```

---

## Summary

The Scheduler is a powerful pattern for precise event timing:

1. **Sliding Window**: Maintains a buffer of pre-scheduled events
2. **Three Operations**: Generate → Consume → Cleanup
3. **Lookahead**: Events are generated ahead of time (typically 200ms)
4. **Precise Timing**: Web Audio receives exact timestamps
5. **Flexible**: Works with any event type and generation pattern

**Key Takeaways:**

- Generate events in the `generator()` callback
- Return events with `ticks` set
- Transport handles conversion to audio clock time
- Consumer receives events with precise `contextTime`
- Modify patterns in real-time by changing generator logic

For more details, see the main DOCUMENTATION.md file.
