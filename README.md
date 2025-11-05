# Blibliki

<p align="center">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Web%20Audio%20API-FF7F00?style=for-the-badge&logo=javascript&logoColor=white" alt="Web Audio API">
  <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React">
  <img src="https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220" alt="PNPM">
</p>

## Overview

Blibliki is a web audio project that provides a framework for building synthesizers and audio applications. This monorepo contains multiple packages that work together to create a complete audio development ecosystem.

## Key Packages

### [Engine](/packages/engine)

The core audio engine built directly on the Web Audio API. It provides a modular, data-driven approach to audio synthesis with support for:

- Oscillators, filters, envelopes, and other audio modules
- MIDI device integration
- Polyphonic synthesis
- Node.js compatibility

[Learn more about the Engine](/packages/engine)

### [Transport](/packages/transport)

A musical transport and scheduler built on top of the Web Audio API. It provides precise timing and musical coordination for audio applications with support for:

- Musical time signatures and BPM control
- Event scheduling and generation
- Swing and groove quantization
- Transport controls (play/stop/reset)
- Musical position tracking

[Learn more about Transport](/packages/transport)

### [Grid](/apps/grid)

A visual interface for the Blibliki Engine that allows users to create and connect audio modules through an intuitive drag-and-drop interface. Features include:

- Visual patching of audio modules
- Real-time parameter control
- MIDI device connectivity
- Patch saving and loading
- User authentication

[Learn more about Grid](/apps/grid)

## Project Structure

```
blibliki/
├── apps/                # Applications
│   ├── demo/            # Simple demo application
│   └── grid/            # Main visual interface
├── packages/            # Libraries and utilities
│   ├── engine/          # Core audio engine
│   ├── utils/           # Shared utilities
│   └── [other]/         # Additional packages
├── pnpm-workspace.yaml  # Workspace configuration
└── package.json         # Root package configuration
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

## Development

Each package has its own README with specific development instructions. In general:

- The engine package can be developed independently
- The grid application depends on the engine package
- Changes to shared packages require rebuilding dependent packages

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
