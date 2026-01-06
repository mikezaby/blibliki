# Blibliki Web Audio Engine

A modular synthesis engine for building audio applications.

<p>
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Web%20Audio%20API-FF7F00?style=for-the-badge&logo=javascript&logoColor=white" alt="Web Audio API">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js Compatible">
</p>

## What is Blibliki Engine?

Blibliki Engine is a data-driven JavaScript library written in TypeScript that serves as a framework for building synthesizers. The current version is built directly on the Web Audio API, replacing a previous version that was built on top of Tone.js. This change gives better control and understanding of the underlying audio processing.

This project started as an educational initiative but has grown into a practical tool for creating synthesizers and audio applications. It runs in both browsers and Node.js environments through [node-web-audio-api](https://github.com/ircam-ismm/node-web-audio-api).

## How it Works

The engine is data-driven, meaning you provide changes to the module configuration rather than directly manipulating the modules. This approach works well with state management libraries like Redux and makes it easy to save and load synthesizer patches.

By representing the synthesizer configuration as data, you can easily store and load patches, enabling users to save and share their custom presets.

## Main Features

- **Modular Design**: Connect audio modules to build sound chains
- **MIDI Support**: Connect to MIDI devices and process MIDI events
- **Polyphony**: Play multiple notes at the same time
- **Node.js Support**: Run in server environments
- **TypeScript**: Full type definitions for better development
- **Patch System**: Save and recall synth configurations as data

## Blog Posts

I've written some blog posts about the engine's development:

- [Part 1: Story & Engine Explanation](https://mikezaby.com/posts/web-audio-engine-part1)
- [Part 2: Shaping the Core of Our Modular Audio Engine](https://mikezaby.com/posts/web-audio-engine-part2)
- [Part 3: Integrating WebAudio API](https://mikezaby.com/posts/web-audio-engine-part3)
- [Part 4: Implementing Advanced I/O](https://mikezaby.com/posts/web-audio-engine-part4)

## Installation

```bash
# Using npm
npm install @blibliki/engine

# Using yarn
yarn add @blibliki/engine

# Using pnpm
pnpm add @blibliki/engine
```

## Quick Start

Here's a simple example to get you started:

```typescript
import { Engine, ModuleType, OscillatorWave } from "@blibliki/engine";

// Create a new audio context
const context = new AudioContext();
const engine = new Engine(context);

// Initialize the engine
await engine.initialize();

// Create an oscillator
const oscillator = engine.addModule({
  name: "Oscillator",
  moduleType: ModuleType.Oscillator,
  props: {
    wave: OscillatorWave.sine,
    frequency: 440,
  },
});

// Create a gain module
const gain = engine.addModule({
  name: "Gain",
  moduleType: ModuleType.Gain,
  props: { gain: 0.5 },
});

// Create a master output
const master = engine.addModule({
  name: "Master",
  moduleType: ModuleType.Master,
  props: {},
});

// Connect the modules
engine.addRoute({
  source: { moduleId: oscillator.id, ioName: "out" },
  destination: { moduleId: gain.id, ioName: "in" },
});

engine.addRoute({
  source: { moduleId: gain.id, ioName: "out" },
  destination: { moduleId: master.id, ioName: "in" },
});

// Start the engine
engine.start();
```

## Usage

### Initializing

```typescript
import { Engine, ModuleType, OscillatorWave } from "@blibliki/engine";

// Create a new audio context
const context = new AudioContext();
const engine = new Engine(context);

// Initialize the engine
await engine.initialize();
```

### Modules

#### AudioModule structure

All audio modules share the shame structure.
The props structure vary per audioModule.

```JavaScript
{
  id: string,
  name: string',
  moduleType: ModuleType,
  props: object,
  inputs: [{
    id: string,
    name: string,
    ioType: IOType,
    moduleId: string
  }],
  outputs: [{
    id: string,
    name: string,
    ioType: IOType,
    moduleId: string
  }]
}
```

Each module comes with a schema that defines the types and accepted values for its properties. These schemas provide TypeScript type safety and validation.

#### Oscillator

Generates sound waves with different shapes.

```typescript
const oscillator = engine.addModule({
  name: "Oscillator",
  moduleType: ModuleType.Oscillator,
  props: {
    wave: OscillatorWave.sine,
    frequency: 440,
    fine: 0,
    coarse: 0,
    octave: 0,
  },
});
```

#### Gain

Controls the volume of audio signals.

```typescript
const gain = engine.addModule({
  name: "Gain",
  moduleType: ModuleType.Gain,
  props: {
    gain: 0.5,
  },
});
```

#### Filter

Filters frequencies from audio signals.

```typescript
const filter = engine.addModule({
  name: "Filter",
  moduleType: ModuleType.Filter,
  props: {
    type: "lowpass",
    frequency: 1000,
    Q: 1,
    envelopeAmount: 0, // amount of envelope modulation (0 to 1)
  },
});
```

#### Envelope

Shapes the volume of sounds over time (ADSR).

```typescript
const envelope = engine.addModule({
  name: "Envelope",
  moduleType: ModuleType.Envelope,
  props: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.7,
    release: 0.5,
  },
});
```

#### Master

Sends audio to your speakers.

```typescript
const master = engine.addModule({
  name: "Master",
  moduleType: ModuleType.Master,
  props: {},
});
```

#### MidiInput

Handles MIDI input from keyboards or controllers.

```typescript
const midi = engine.addModule({
  name: "MIDI",
  moduleType: ModuleType.MidiInput,
  props: {
    selectedId: "your-midi-device-id",
  },
});
```

#### Constant

Creates a fixed value for modulation.

```typescript
const constant = engine.addModule({
  name: "Constant",
  moduleType: ModuleType.Constant,
  props: {
    value: 1,
  },
});
```

#### Scale

Converts values from one range to another.

```typescript
const scale = engine.addModule({
  name: "Scale",
  moduleType: ModuleType.Scale,
  props: {
    min: 0,
    max: 1,
    current: 0.5,
  },
});
```

#### Inspector

Shows signal values for debugging.

```typescript
const inspector = engine.addModule({
  name: "Inspector",
  moduleType: ModuleType.Inspector,
  props: {},
});
```

#### VirtualMidi

Creates MIDI events from code.

```typescript
const virtualMidi = engine.addModule({
  name: "Virtual MIDI",
  moduleType: ModuleType.VirtualMidi,
  props: {},
});
```

## Development

To contribute to the project:

```bash
# Clone the repository
git clone https://github.com/mikezaby/blibliki.git

# Install dependencies
pnpm install

# Build the project
pnpm dev
```

## License

MIT
