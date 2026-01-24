# @blibliki/transport

> Musical transport and scheduler on top of the WebAudio API.

A precision timing engine for music applications. Converts musical time (bars, beats, ticks) into sample-accurate Web Audio scheduling using a sliding-window scheduler.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Key Concepts](#key-concepts)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Development](#development)

## Features

- **Precision Scheduling** - Sample-accurate event timing via 200ms lookahead scheduler
- **Musical Time** - 15,360 ticks per beat with support for any time signature
- **Tempo Control** - Change BPM mid-playback without losing position
- **Swing** - Built-in swing/shuffle timing (0.5 to 0.75)
- **Position Management** - Jump to any bar:beat:sixteenth position
- **UI Callbacks** - Clock and bar callbacks for visual synchronization
- **TypeScript** - Fully typed with generic event support
- **Minimal** - Zero dependencies except `@blibliki/utils`

## Installation

```sh
pnpm add @blibliki/transport
# or
npm install @blibliki/transport
# or
yarn add @blibliki/transport
```

## Quick Start

Create a transport by supplying a WebAudio context (wrapped in the shared `Context` class) and a listener object that knows how to generate and consume scheduled events. The generator runs in transport ticks, the consumer receives the same events translated into AudioContext time.

```ts
import { Position, Transport, TransportEvent } from "@blibliki/transport";
import { Context } from "@blibliki/utils";

type ClickEvent = TransportEvent & { accent: boolean };

const context = new Context();
const SIXTEENTH = 3840; // 1/16 note in transport ticks (15360 ticks per quarter)

const transport = new Transport<ClickEvent>(context, {
  generator: (windowStart, windowEnd) => {
    const events: ClickEvent[] = [];

    // Quantise to the next sixteenth before emitting events
    let tick = Math.ceil(windowStart / SIXTEENTH) * SIXTEENTH;

    while (tick < windowEnd) {
      const step = Math.round(tick / SIXTEENTH);

      events.push({
        ticks: tick,
        // `time` and `contextTime` will be overwritten by the transport
        time: 0,
        contextTime: 0,
        accent: step % 4 === 0,
      });

      tick += SIXTEENTH;
    }

    return events;
  },
  consumer: (event) => {
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
    console.log("transport started at", contextTime);
  },
  onStop: (contextTime) => {
    console.log("transport stopped at", contextTime);
  },
  onJump: (ticks) => {
    console.debug("jumped to transport ticks", ticks);
  },
  silence: (contextTime) => {
    // stop any ringing voices when the transport is halted
  },
});

async function main() {
  await context.resume();
  transport.bpm = 100;
  transport.start();

  console.log("current bar:beat:sixteenth ->", transport.position.toString());
}

main();
```

## Key Concepts

### Listener Callbacks

The listener object bridges musical intent and actual audio:

- **`generator(startTicks, endTicks)`** - Returns events in the time window (in ticks)
- **`consumer(event)`** - Schedules audio nodes using `event.contextTime`
- **`onStart/onStop/onJump/silence`** - Lifecycle hooks

**Important:** Keep your generator idempotent—the transport may call it with overlapping windows.

### Musical Time

- Transport runs at **15,360 ticks per quarter note**
- Use `Position` helper for conversions: `new Position("2:1:1", [4, 4])`
- Control via properties: `bpm`, `timeSignature`, `swingAmount`, `position`

### UI Callbacks

Register callbacks for UI updates:

- `transport.addClockCallback()` - Fires every ~20ms

## API Overview

### Transport Control

```ts
transport.start(); // Start playback
transport.stop(); // Stop (pause) playback
transport.reset(); // Reset to position 0
transport.state; // "playing" | "stopped" | "paused"
```

### Properties

```ts
transport.bpm = 120; // Tempo (beats per minute)
transport.timeSignature = [4, 4]; // Time signature
transport.swingAmount = 0.6; // Swing (0.5 = none, 0.75 = max)
transport.position; // Current position (get/set)
```

### Position

```ts
import { Position } from "@blibliki/transport";

const pos = new Position("2:1:3", [4, 4]); // Bar 2, beat 1, sixteenth 3
console.log(pos.ticks); // Get ticks
console.log(pos.toString()); // "2:1:3"
```

### Utilities

```ts
import { TPB, divisionToTicks } from "@blibliki/transport";

const sixteenthTicks = TPB / 4; // 3840 ticks
const eighthTicks = divisionToTicks("1/8"); // 7680 ticks
```

## Documentation

For comprehensive guides and examples:

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Complete architecture guide, API reference, and detailed examples
- **[SCHEDULER_EXAMPLES.md](./SCHEDULER_EXAMPLES.md)** - Advanced scheduler patterns and use cases

### What's Covered

**DOCUMENTATION.md includes:**

- Three time systems (ticks, clock time, context time)
- Scheduler deep dive with timing diagrams
- Complete architecture breakdown
- Position and tempo management
- Full API reference
- Troubleshooting guide

**SCHEDULER_EXAMPLES.md includes:**

- Minimal scheduler implementation
- Visual scheduler simulation
- Step sequencer patterns
- Dynamic event generation
- Multi-track scheduling
- Advanced patterns (tempo automation, event modification, MIDI recording)

## Development

Run the usual scripts from the package root:

```sh
pnpm run build    # bundle with tsup
pnpm run lint     # check sources with eslint
pnpm run tsc      # type-check
```

## Fork Notice

This package is forked and adjusted from [GustavTaxen/webaudio-transport](https://gitlab.com/GustavTaxen/webaudio-transport).
