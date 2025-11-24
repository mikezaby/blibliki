# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blibliki is a web audio synthesis framework built on the Web Audio API. It's a TypeScript-based monorepo using pnpm workspaces that provides a modular, data-driven approach to audio synthesis with MIDI integration and visual patching capabilities.

## Repository Structure

This is a pnpm monorepo with the following structure:

- **packages/** - Shared libraries published as packages
  - **engine/** - Core audio engine built on Web Audio API with modular synthesis
  - **transport/** - Musical transport and scheduler for precise timing
  - **utils/** - Shared utilities (Context, deterministicId, oscilloscope)

- **apps/** - Applications consuming the packages
  - **grid/** - Main visual patching interface (React + Redux + TanStack Router + Firebase)
  - **demo/** - Simple demo application
  - **bubbleton/** - Additional demo application

## Common Development Commands

```bash
# Install dependencies (run this first)
pnpm install

# Start all development servers in parallel
pnpm dev

# Build all packages and apps
pnpm build

# Build only the packages (not apps)
pnpm build:packages

# Type checking across all workspaces
pnpm tsc

# Linting across all workspaces
pnpm lint

# Format code across all workspaces
pnpm format

# Check formatting without modifying files
pnpm format:check

# Run tests (only engine has tests currently)
pnpm test

# Run tests in engine package specifically
cd packages/engine && pnpm test
```

## Architecture Fundamentals

### Engine Package Architecture

The engine is the core of Blibliki. Key concepts:

**Module System**: Audio modules are TypeScript classes that extend the `Module` or `PolyModule` base classes. Each module:
- Has typed inputs/outputs (AudioIO for audio, MidiIO for MIDI)
- Manages its own Web Audio API nodes
- Defines a schema for its properties
- Can be serialized/deserialized

**IO System** (packages/engine/src/core/IO/):
- `AudioIO` - Wraps Web Audio API connections for audio signals
- `MidiIO` - Handles MIDI event routing between modules
- Modules connect via a routing system managed by the `Routes` class

**PolyModule**: A special module type that manages multiple voices for polyphonic synthesis. It uses `VoiceScheduler` to allocate voices on MIDI note events.

**Available Modules** (packages/engine/src/modules/):
- Oscillator, Filter, Gain, Envelope, Master
- StepSequencer, MidiMapper, MidiSelector, VirtualMidi
- Constant, Scale, Inspector, StereoPanner

**Audio Worklet Processors** (packages/engine/src/processors/):
Custom DSP code runs in the audio thread. Must be loaded via `loadProcessors()` before engine initialization.

### Transport Package Architecture

The transport provides musical timing separate from audio clock time:

**Key Classes**:
- `Transport` - Main transport controller, converts musical time to audio time
- `Clock` - Tracks musical position in bars/beats/sixteenths
- `Tempo` - Manages BPM and time signature
- `Scheduler` - Schedules events with lookahead
- `Position` - Musical position representation (bars, beats, sixteenths)

**Event Flow**: Generator functions create events → Transport schedules them → Consumer functions execute them at precise audio times

### Grid Application Architecture

The grid app is a React application with:

**State Management**:
- Redux Toolkit with slices for global state, modules, MIDI devices, grid nodes, modals, and patches
- Store configuration in `apps/grid/src/store/index.ts`

**Key Slices**:
- `modulesSlice` - Tracks all audio modules and their parameters
- `gridNodesSlice` - Manages visual node positions and connections (using @xyflow/react)
- `midiDevicesSlice` - MIDI device state
- `patchSlice` - Current patch state
- `modalSlice` - Modal dialogs

**Visual Patching**: Uses @xyflow/react for node-based visual interface. Nodes represent audio modules, edges represent routes/connections.

**Firebase Integration**:
- Authentication via Clerk
- Firestore for patch storage
- Models defined in `apps/grid/src/models/`

**Component Structure**:
- `AudioModule/` - Individual module UI components
- `Grid/` - The main canvas with drag-and-drop nodes
- `Modal/` - Various modal dialogs
- `layout/` - Header, AudioModules panel, etc.

## TypeScript Configuration

- Path aliases use `@/` for `src/` directories within each package/app
- Bundler module resolution
- Strict type checking enabled
- Engine package uses `vitest` with setup in `test/testSetup.ts`

## Testing

Currently only the engine package has tests:

```bash
cd packages/engine
pnpm test              # Run all tests
pnpm test Scale.test   # Run specific test file
```

Tests are in `packages/engine/test/modules/` and use vitest.

## Package Dependencies

**Dependency flow**: utils → transport → engine → apps

When making changes:
1. If you modify `utils` or `transport`, rebuild them before testing in `engine`
2. If you modify `engine`, rebuild it before testing in `grid`
3. Use `pnpm build:packages` to rebuild all packages at once

## Publishing Packages

The three packages (@blibliki/utils, @blibliki/transport, @blibliki/engine) are published to npm:

```bash
# In a specific package directory
pnpm bump    # Increments patch version
pnpm release # Builds and publishes to npm
```

## Key Files for Understanding the System

- `packages/engine/src/Engine.ts` - Main engine class, module lifecycle
- `packages/engine/src/core/module/Module.ts` - Base module class
- `packages/engine/src/core/module/PolyModule.ts` - Polyphonic module base
- `packages/engine/src/core/IO/` - Input/output connection system
- `packages/transport/src/Transport.ts` - Musical timing system
- `apps/grid/src/store/index.ts` - Redux store configuration
- `apps/grid/src/components/Grid/index.tsx` - Main visual canvas

## Adding a New Audio Module

1. Create module class in `packages/engine/src/modules/YourModule.ts`
2. Extend `Module` or `PolyModule` base class
3. Define the module schema using `modulePropSchema()`
4. Implement Web Audio API nodes in the constructor
5. Export schema in `packages/engine/src/modules/index.ts`
6. Add corresponding UI component in `apps/grid/src/components/AudioModule/YourModule.tsx`

## MIDI Architecture

- `MidiDeviceManager` manages all MIDI input devices
- `MidiDevice` wraps WebMIDI API devices
- `ComputerKeyboardDevice` provides keyboard as MIDI input
- MIDI events flow through `MidiIO` connections between modules
- Modules like `MidiSelector` route MIDI from devices to the engine
- `VirtualMidi` allows programmatic MIDI generation

## Style and Formatting

- Prettier for code formatting (config in `prettier.config.cjs`)
- ESLint with TypeScript strict rules (config in `eslint.config.js`)
- React 19 with experimental compiler enabled
- Tailwind CSS for styling (Grid app uses Tailwind v4)
