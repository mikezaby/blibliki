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
- pnpm or npm available on the device
- Audio output configured (via HDMI, 3.5mm jack, or USB audio interface)

### Linux Audio Setup

This section is **Linux-only**.

On macOS, `@blibliki/pi` can run without JACK, PipeWire, or the `pw-jack`
wrapper. You can start it directly with `blibliki-pi` or `pnpm start`.

`@blibliki/pi` uses `node-web-audio-api` for audio output in Node.js. On Linux,
that library is built against JACK and works with either:

- a running JACK server
- PipeWire's JACK compatibility layer (`pipewire-jack`)

PipeWire with JACK compatibility is the recommended setup because it works well
on Raspberry Pi OS and other modern Linux distributions.

For Debian, Ubuntu, or Raspberry Pi OS, install PipeWire and the JACK shim:

```bash
sudo apt update
sudo apt install pipewire pipewire-jack wireplumber
```

After installation, make sure the `pw-jack` wrapper is available:

```bash
pw-jack --help
```

If your distribution uses different package names, install the packages that
provide:

- PipeWire
- a session manager such as WirePlumber
- JACK compatibility for PipeWire
- the `pw-jack` command

If `node-web-audio-api` must compile from source on your platform, install the
native build dependencies first:

```bash
sudo apt install libasound2-dev libjack-jackd2-dev
```

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
# macOS
blibliki-pi

# Linux
pw-jack blibliki-pi
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
# macOS
blibliki-pi

# Linux
pw-jack blibliki-pi
```

Your Pi will automatically read the device document from Firestore and start
the configured deployment target:

- a plain Grid patch
- or an instrument document

### Running From The Repository

If you are developing from this monorepo instead of using the published CLI:

```bash
pnpm install
pnpm build:packages
cd packages/pi

# macOS
pnpm start

# Linux
pw-jack pnpm start
```

`pnpm start` runs the local `blibliki-pi` CLI entrypoint in development mode.
On Linux, keep the `pw-jack` prefix so the Node audio runtime can connect to
PipeWire's JACK layer. On macOS, run it directly.

## Running With `pi-display`

`@blibliki/pi` can publish display state to the independent `apps/pi-display`
process over OSC.

### Display-first workflow

Start the display listener first from the worktree root:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
SLINT_BACKEND=winit BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

On Raspberry Pi without X11 or Wayland, use `SLINT_BACKEND=linuxkms-software` instead. If you omit `SLINT_BACKEND`, Slint may auto-select a direct-display backend on the Pi.

Then start the Pi runtime in OSC mode:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_PI_DISPLAY_MODE=osc \
BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1 \
BLIBLIKI_PI_DISPLAY_PORT=41234 \
BLIBLIKI_PI_CONTROL_PORT=41235 \
BLIBLIKI_PI_DISPLAY_DEBUG=1 \
pnpm -C packages/pi start-default
```

This is the easiest local setup because `start-default` does not depend on
Firestore or the Grid deployment target.

### Firestore-driven runtime

If you want the normal configured device path instead:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_PI_DISPLAY_MODE=osc \
BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1 \
BLIBLIKI_PI_DISPLAY_PORT=41234 \
BLIBLIKI_PI_CONTROL_PORT=41235 \
BLIBLIKI_PI_DISPLAY_DEBUG=1 \
pnpm -C packages/pi start
```

### Compact layout family

To publish the `800x480` layout preset instead of the default `1280x720`
preset, add:

```bash
BLIBLIKI_PI_DISPLAY_TARGET_CLASS=compact-standard
```

### Environment Variables

- `BLIBLIKI_PI_DISPLAY_MODE=terminal|osc`
- `BLIBLIKI_PI_DISPLAY_HOST`
- `BLIBLIKI_PI_DISPLAY_PORT`
- `BLIBLIKI_PI_CONTROL_PORT`
- `BLIBLIKI_PI_DISPLAY_DEBUG=0|1`
- `BLIBLIKI_PI_DISPLAY_TARGET_CLASS=standard|compact-standard`

### Debugging

If you want to test the display without the engine, use the fixture tools:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:send-full
pnpm -C packages/display-protocol debug:send-band --band upper
pnpm -C packages/display-protocol debug:dump
```

For the display-side requirements and startup notes, see:

- [apps/pi-display/README.md](/Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc/apps/pi-display/README.md)

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
