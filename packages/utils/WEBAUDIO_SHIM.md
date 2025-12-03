# Web Audio API Shim

This package provides seamless usage of the Web Audio API between browser and Node.js environments via a dedicated subpath export.

## Features

- **Browser Support**: Uses the native Web Audio API when running in the browser
- **Node.js Support**: Automatically uses `node-web-audio-api` when running in Node.js
- **Type Safety**: Full TypeScript support with proper type definitions
- **Zero Configuration**: Works out of the box with automatic environment detection
- **Subpath Export**: Clean separation from main package exports via `@blibliki/utils/audio-context`

## Installation

The shim is included in `@blibliki/utils`. For Node.js environments, you'll need to install the optional dependency:

```bash
pnpm add node-web-audio-api
```

## Usage

### Basic Usage

Import Web Audio API classes from the dedicated subpath `@blibliki/utils/audio-context`:

```typescript
import {
  AudioContext,
  OscillatorNode,
  GainNode,
} from "@blibliki/utils/audio-context";

// Works in both browser and Node.js!
const audioContext = new AudioContext();
const oscillator = new OscillatorNode(audioContext);
const gainNode = new GainNode(audioContext);

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);
oscillator.start();
```

### Available Classes

All standard Web Audio API classes are available:

- `AudioContext`
- `OfflineAudioContext`
- `AudioBuffer`
- `AudioBufferSourceNode`
- `OscillatorNode`
- `GainNode`
- `BiquadFilterNode`
- `DelayNode`
- `ConvolverNode`
- `DynamicsCompressorNode`
- `WaveShaperNode`
- `StereoPannerNode`
- `AnalyserNode`
- `ChannelMergerNode`
- `ChannelSplitterNode`
- `AudioWorkletNode`
- `PeriodicWave`
- `ConstantSourceNode`
- `PannerNode`
- `AudioListener`
- `AudioParam`
- `AudioDestinationNode`

### Environment Detection

You can check which environment you're running in:

```typescript
import {
  isBrowserEnvironment,
  isNodeEnvironment,
} from "@blibliki/utils/audio-context";

if (isBrowserEnvironment) {
  console.log("Running in browser");
}

if (isNodeEnvironment) {
  console.log("Running in Node.js");
}
```

### Using with Context Class

The `Context` class from the main package automatically uses the shimmed `AudioContext`:

```typescript
import { Context } from "@blibliki/utils";

// The Context class internally uses the audio-context shim
// Works seamlessly in both environments
const context = new Context();
console.log(context.currentTime);
```

## How It Works

The shim detects the environment at runtime:

1. **Browser**: Checks if `window.AudioContext` exists
2. **Node.js**: Falls back to loading `node-web-audio-api`

This means your code can be written once and work in both environments without modification.

## Error Handling

If you're running in Node.js and `node-web-audio-api` is not installed, you'll get a clear error message:

```
node-web-audio-api is required for Node.js environments. Install it with: pnpm add node-web-audio-api
```
