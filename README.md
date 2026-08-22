# Blibliki

<p align="center">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Web%20Audio%20API-FF7F00?style=for-the-badge&logo=javascript&logoColor=white" alt="Web Audio API">
  <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React">
  <img src="https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220" alt="PNPM">
</p>

## Overview

Blibliki is a web audio synthesis project: a modular engine built directly on the
Web Audio API, plus everything around it needed to actually play music with it.

It started as a patching framework — modules and cables, driven by data. That part
is still here and still the foundation. But the project's focus has moved up a
level, to **the instrument and its performance mode**.

## The Focus: Instrument & Performance Mode

A patch is a graph. An _instrument_ is a product: tracks, blocks, pages, and
controller slots that a musician owns, saves, and plays.

[`@blibliki/instrument`](/packages/instrument) turns a stored instrument document into

- an engine patch (modules + routes),
- navigation state for tracks, pages, and controller modes,
- display state for a hardware screen,
- MIDI controller behaviour for the Novation Launch Control XL3,
- persistence-ready snapshots.

**Performance mode** is where you play it. `@blibliki/instrument/react` ships
`InstrumentPerformance`, an on-screen performance console laid out as a fixed
faceplate and scaled to whatever screen it lands on — desktop, tablet, phone,
or a Pi's panel. Encoders drag and answer arrow keys, synthesizing the same
relative CC events the hardware sends, so the console and a Launch Control XL3
drive the same session.

The same console runs in three places: `apps/grid` (in the browser, next to the
patch editor), `apps/mobile` (iOS/Android via Capacitor), and headless on a
Raspberry Pi with its own display.

## Packages

| Package                                                    | What it is                                                                                                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@blibliki/engine`](/packages/engine)                     | Core modular audio engine on the Web Audio API — oscillators, filters, envelopes, effects, drum machine, step sequencer, polyphony, MIDI. Runs in browsers and Node. |
| [`@blibliki/instrument`](/packages/instrument)             | The performance-instrument layer: document → tracks/blocks/pages → compiled engine patch → live session. Ships the React performance console under `/react`.         |
| [`@blibliki/transport`](/packages/transport)               | Musical transport and scheduler: bars/beats/ticks, tempo, swing, sample-accurate lookahead scheduling.                                                               |
| [`@blibliki/ui`](/packages/ui)                             | Shared UI primitives, theme tokens, and UI-governance ESLint rules used by the apps.                                                                                 |
| [`@blibliki/models`](/packages/models)                     | Firestore-backed models: `Patch`, `Instrument`, `Device`.                                                                                                            |
| [`@blibliki/display-protocol`](/packages/display-protocol) | OSC protocol and state types for the Pi hardware display.                                                                                                            |
| [`@blibliki/pi`](/packages/pi)                             | Headless runtime + `blibliki-pi` CLI for Raspberry Pi and other Node environments.                                                                                   |
| [`@blibliki/utils`](/packages/utils)                       | Shared utilities: audio `Context`, deterministic IDs, oscilloscope.                                                                                                  |

## Apps

| App                            | What it is                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [grid](/apps/grid)             | The main web app: visual patching, instrument editing, and performance mode. React + Redux + TanStack Router + Firebase, auth via Clerk. |
| [mobile](/apps/mobile)         | The performance console on iOS and Android via Capacitor — pick an instrument, then play it.                                             |
| [pi-display](/apps/pi-display) | Independent Slint process rendering the Pi dashboard from OSC state published by `@blibliki/pi`.                                         |
| [storybook](/apps/storybook)   | Playground for `@blibliki/ui` components.                                                                                                |

## Project Structure

```
blibliki/
├── apps/
│   ├── grid/                # Web app: patching, instruments, performance
│   ├── mobile/              # Capacitor iOS/Android performance app
│   ├── pi-display/          # Slint display process for the Pi
│   └── storybook/           # UI component playground
├── packages/
│   ├── engine/              # Core audio engine
│   ├── instrument/          # Instrument + performance layer
│   ├── transport/           # Musical transport and scheduler
│   ├── ui/                  # Shared UI primitives and tokens
│   ├── models/              # Firestore models
│   ├── display-protocol/    # OSC display protocol
│   ├── pi/                  # Headless Raspberry Pi / Node runtime
│   └── utils/               # Shared utilities
├── docs/plans/              # Design and implementation plans
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

This project uses PNPM for package management and workspace handling.

```bash
# Install dependencies
pnpm install

# Start development servers for all packages
pnpm dev

# Build all packages
pnpm build
```

Dependency flow is `utils → transport → engine → instrument → apps`. If you
change a package, rebuild it before testing downstream (`pnpm build:packages`
rebuilds them all).

## Development

Each package has its own README with specific instructions. Across the repo:

```bash
pnpm tsc      # type check
pnpm lint     # lint
pnpm test     # tests
pnpm format   # format
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
