# @blibliki/pi

Run Blibliki audio synthesis on Raspberry Pi and other Node.js environments.

## Overview

@blibliki/pi enables Blibliki to run as a standalone audio engine on Raspberry Pi and other Node.js environments, making it easy to create dedicated hardware synths without a browser. It integrates seamlessly with the Blibliki Grid app, allowing you to design patches visually and deploy them to your Raspberry Pi.

## Key Features

- **Headless Audio Engine**: Run Blibliki patches without a browser
- **Easy Setup**: Simple installation and configuration process
- **Grid Integration**: Connect your Raspberry Pi to the Grid app for remote patch management
- **Auto-loading Patches**: Select which patch to run on startup from the Grid app
- **Token-based Authentication**: Secure connection between your Pi and Grid account

## How It Works

1. **First Run**: When you run @blibliki/pi for the first time (or if no config exists), it generates a unique authentication token
2. **Connect to Grid**: Use this token in the Grid app to register your Raspberry Pi
3. **Select Patch**: In the Grid app, choose which patch you want to auto-load on your Raspberry Pi
4. **Run**: Your Raspberry Pi will automatically load and run the selected patch on startup

## Installation

### Prerequisites

- Node.js 18+ installed on your Raspberry Pi
- Audio output configured (via HDMI, 3.5mm jack, or USB audio interface)

### Install

```bash
npm install -g @blibliki/pi
# or
pnpm add -g @blibliki/pi
```

## Usage

### First Time Setup

Run blibliki-pi for the first time:

```bash
blibliki-pi
```

This will:

1. Generate a configuration file with a unique token
2. Display the token for you to copy
3. Provide instructions for connecting to Grid

### Connecting to Grid

1. Open the Blibliki Grid app (https://blibliki.com)
2. Navigate to Settings Devices
3. Click "Add Blibliki Pi"
4. Enter the token displayed by your Raspberry Pi
5. Give your Pi a name (e.g., "Experimental Synth")

### Selecting a Patch

Once connected:

1. In the Grid app, open any patch you want to deploy
2. Click "Deploy to Device"
3. Select your Raspberry Pi from the list
4. Choose whether to auto-load this patch on startup

### Running

After setup, simply run:

```bash
blibliki-pi
```

Your Pi will automatically load and run the configured patch.

## Architecture

@blibliki/pi wraps the @blibliki/engine package and provides:

- Node.js audio backend (instead of Web Audio API)
- Configuration management
- Token-based authentication
- Remote patch synchronization with Grid
- Auto-start capabilities

## Development

This package is part of the Blibliki monorepo.

```bash
# Build
pnpm build

# Development mode with watch
pnpm dev

# Type checking
pnpm tsc

# Linting
pnpm lint
```

## License

MIT

## Links

- [Main Blibliki Repository](https://github.com/mikezaby/blibliki)
- [Grid App](https://grid.blibliki.com)
- [Documentation](https://docs.blibliki.com)
