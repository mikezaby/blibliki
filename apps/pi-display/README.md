# pi-display

Independent Slint display process for the Blibliki Pi dashboard.

## Overview

`pi-display` is the UI side of the Raspberry Pi display architecture.

- `@blibliki/pi` publishes display state over OSC on localhost
- `pi-display` listens for OSC messages, keeps the latest state, and renders it with Slint

This app is intentionally independent from the Pi runtime. It does not spawn the engine and the engine does not spawn it.

## Current Scope

The current branch supports:

- OSC-driven display updates
- full snapshots plus section-level band updates
- two landscape layout presets:
  - `standard` for `1280x720`
  - `compact-standard` for `800x480`
- a retro-modern monochrome UI with a warm amber accent

## Requirements

### General

- Node.js and `pnpm`
- dependencies installed from the monorepo root:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm install
```

### Native Slint module approval

If `pnpm` blocks the Slint native package install, approve it:

```bash
pnpm approve-builds
```

Approve `slint-ui`.

### macOS note: `gettext`

On macOS, the currently resolved `slint-ui` native binary may require:

```bash
brew install gettext
```

If startup fails with a missing `libintl.8.dylib` error, install `gettext` and retry.

### Raspberry Pi / LinuxKMS note

For Pi validation without X11 or Wayland, use:

```bash
SLINT_BACKEND=linuxkms-software
```

If you do not set `SLINT_BACKEND`, Slint may auto-select a direct-display backend on the Pi anyway.

This project currently documents the runtime path, but backend-specific system package requirements still need validation on target hardware.

## Start The Display

### macOS / desktop

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
SLINT_BACKEND=winit BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

What this does:

- opens the Slint window
- binds UDP on `41234`
- sends `/blibliki/v1/display/request_full_state` to `127.0.0.1:41235`
- logs incoming message summaries when `BLIBLIKI_DISPLAY_DEBUG=1`

### Hot Reload During UI Work

For local iteration on the display app itself:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki
SLINT_BACKEND=winit BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display dev
```

This `dev` runner watches [src](/Users/mikezaby/projects/blibliki/blibliki/apps/pi-display/src) and [ui](/Users/mikezaby/projects/blibliki/blibliki/apps/pi-display/ui), then restarts the display process when you change TypeScript or Slint files.

### Raspberry Pi without X

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
SLINT_BACKEND=linuxkms-software BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

If Slint auto-selects a direct KMS backend that does not provide a Node-compatible event loop, `pi-display` now falls back to a show-only mode instead of crashing.

## Fast Standalone Debug

You do not need the Pi engine running to test the display.

Start the display first, then from another terminal send a full debug snapshot:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:send-full
```

Force the compact `800x480` preset:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_DEBUG_TARGET_CLASS=compact-standard pnpm -C packages/display-protocol debug:send-full
```

Send a section update:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:send-band
```

Target a specific band:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:send-band --band upper
```

Dump incoming OSC traffic:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:dump
```

## Run With `@blibliki/pi`

Start the display:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
SLINT_BACKEND=winit BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

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

Use the compact layout family:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_PI_DISPLAY_MODE=osc \
BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1 \
BLIBLIKI_PI_DISPLAY_PORT=41234 \
BLIBLIKI_PI_CONTROL_PORT=41235 \
BLIBLIKI_PI_DISPLAY_DEBUG=1 \
BLIBLIKI_PI_DISPLAY_TARGET_CLASS=compact-standard \
pnpm -C packages/pi start-default
```

## Useful Environment Variables

### Display process

- `BLIBLIKI_DISPLAY_PORT`
- `BLIBLIKI_DISPLAY_PI_HOST`
- `BLIBLIKI_DISPLAY_PI_PORT`
- `BLIBLIKI_DISPLAY_DEBUG=1`
- `SLINT_BACKEND=winit|linuxkms-software`

### Common defaults

- display port: `41234`
- Pi control port: `41235`
- host: `127.0.0.1`

## Troubleshooting

### The window opens but stays empty

- run `pnpm -C packages/display-protocol debug:send-full`
- if that updates the window, the display side is fine and the problem is in the Pi publisher path

### `libintl.8.dylib` is missing on macOS

- install `gettext`
- retry the display start command

### The display starts but does not react to OSC messages

- run `pnpm -C packages/display-protocol debug:dump`
- verify packets are arriving on `41234`

### The display crashes with "The Slint platform does not provide an event loop"

- that can happen on Pi direct-display backends, even if you did not set `SLINT_BACKEND` explicitly
- current `pi-display` falls back to a show-only mode when this happens
- if you still want to reduce backend ambiguity, start it explicitly with `SLINT_BACKEND=linuxkms-software`

### The display reacts to fixtures but not to the Pi engine

- make sure `BLIBLIKI_PI_DISPLAY_MODE=osc` is set
- use `pnpm -C packages/pi start-default` first, because it is the fastest local engine path
- enable `BLIBLIKI_PI_DISPLAY_DEBUG=1` and inspect outgoing publish logs
