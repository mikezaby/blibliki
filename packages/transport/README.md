# @blibliki/transport

> Musical transport and scheduler on top of the WebAudio API.

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

Stop the transport with `transport.stop()`, pause with `transport.stop()` (without resetting) and reset the playhead to the beginning with `transport.reset()`.

## Listener Responsibilities

The listener that you pass into the constructor bridges musical intent and actual audio nodes:

- `generator(startTicks, endTicks)` **must** return every event that occurs in the half-open window `[startTicks, endTicks)`. The transport may call this with overlapping windows when rescheduling, so keep your generator idempotent and avoid emitting duplicate events.
- `consumer(event)` receives the events produced by the generator with `time` (transport clock) and `contextTime` (AudioContext time) populated. This is where you schedule audio nodes, MIDI messages, etc.
- `onStart(contextTime)` / `onStop(contextTime)` happen just before the transport starts or stops advancing.
- `onJump(ticks)` is emitted whenever `transport.position` changes abruptly (for example through manual assignment or `reset()`).
- `silence(contextTime)` is called whenever playback should be made quiet immediately—useful for clearing envelopes on stop/reset.

## Working with Musical Time

- The transport runs at `15360` ticks per quarter note. Use the `Position` helper to convert between ticks, strings (`"bars:beats:sixteenths"`), and object notation, as in `new Position("2:1:1", [4, 4]).ticks`.
- Control tempo via the `bpm` getter/setter. Updating the tempo while playing keeps the current transport position intact.
- Change the time signature with the `timeSignature` setter. The default is `4/4`.
- Apply swing by setting `transport.swingAmount` to a value between `0.5` (straight) and `0.75`.
- Reach the current musical position with the `position` getter. Assigning to `transport.position` jumps the playhead and invokes `onJump`.

## UI-Friendly Clocking

To keep visual components in sync you can register clock callbacks:

```ts
transport.addClockCallback((clockTime) => {
  console.log("transport clock is at", clockTime, "seconds of audio time");
});

transport.addBarCallback((bar) => {
  // e.g. update the UI playhead when a new bar begins
});
```

Clock callbacks fire at roughly 16th-note resolution, intended for UI feedback rather than sample-accurate DSP.

## Development

Run the usual scripts from the package root:

```sh
pnpm run build    # bundle with tsup
pnpm run lint     # check sources with eslint
pnpm run tsc      # type-check
```

## Fork Notice

This package is forked and adjusted from [GustavTaxen/webaudio-transport](https://gitlab.com/GustavTaxen/webaudio-transport).
