# Pi Display OSC Usage Guide

**Date:** 2026-04-01
**Status:** Current branch workflow for `codex-pi-display-osc`

This guide documents the commands that exist on this branch for running the independent display service, publishing OSC snapshots from `@blibliki/pi`, and debugging the connection with fixture tools.

## Architecture

The runtime now has two separate processes:

- `packages/pi` publishes display state over OSC when `BLIBLIKI_PI_DISPLAY_MODE=osc`
- `apps/pi-display` listens independently, requests a full snapshot on startup, and renders the dashboard in Slint

The transport defaults are:

- display listen port: `41234`
- Pi control port: `41235`
- host: `127.0.0.1`

## One-Time Setup

Install dependencies from the worktree root:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm install
```

Important note: on some machines `pnpm` may block the `slint-ui` build/install step. If the display app fails to start because the Slint native module is unavailable, run:

```bash
pnpm approve-builds
```

and approve `slint-ui`.

## Start The Display On macOS

For desktop development, run the display app with the windowed backend:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
SLINT_BACKEND=winit BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

What this does:

- binds UDP on `41234`
- sends `/blibliki/v1/display/request_full_state` to `127.0.0.1:41235`
- logs incoming messages when `BLIBLIKI_DISPLAY_DEBUG=1`

## Start The Display On Raspberry Pi Without X

For Pi validation, use the LinuxKMS backend:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki
SLINT_BACKEND=linuxkms-software BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

If you later find a different renderer/backend works better on the Pi, keep the same OSC contract and change only the backend/runtime configuration.

## Start The Pi Runtime In OSC Mode

To make `packages/pi` publish live display state instead of rendering to the terminal:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_PI_DISPLAY_MODE=osc \
BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1 \
BLIBLIKI_PI_DISPLAY_PORT=41234 \
BLIBLIKI_PI_CONTROL_PORT=41235 \
pnpm -C packages/pi start
```

If you omit `BLIBLIKI_PI_DISPLAY_MODE=osc`, the Pi runtime keeps using the terminal fallback renderer.

## Debug Without The Pi Runtime

You can test the display independently with the fixture tools in `packages/display-protocol`.

Start the display first:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
SLINT_BACKEND=winit BLIBLIKI_DISPLAY_DEBUG=1 pnpm -C apps/pi-display start
```

Then, from another terminal, send a known-good full snapshot:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:send-full
```

Send a section update for the global band:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:send-band
```

This is the fastest way to verify:

- the display window launches
- OSC decoding works
- state is applied
- the dashboard redraws

## Dump Incoming OSC Traffic

To inspect incoming packets on the display port:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm -C packages/display-protocol debug:dump
```

By default this listens on `41234`.

## Recommended Development Loop

1. Start `apps/pi-display` with `BLIBLIKI_DISPLAY_DEBUG=1`.
2. Verify the window responds to `debug:send-full`.
3. Verify a partial update with `debug:send-band`.
4. Start `packages/pi` with `BLIBLIKI_PI_DISPLAY_MODE=osc`.
5. Change track, page, or control values in the Pi runtime and confirm the display logs and redraws.

## Failure Interpretation

If the display window opens but does not update with fixture sends:

- the issue is in the display listener, store, or Slint binding layer

If `debug:dump` shows traffic but `apps/pi-display` does not redraw:

- OSC transport is alive
- the problem is after decode, inside the display process

If `apps/pi-display` redraws from fixtures but not from `packages/pi`:

- the problem is on the Pi publishing side
- check that `BLIBLIKI_PI_DISPLAY_MODE=osc` is actually set

If `apps/pi-display` fails to start with native-module errors:

- check `pnpm approve-builds`
- confirm the `slint-ui` native binary is available for the current machine

## Current Visual Direction

The current dashboard direction on this branch is:

- monochrome base palette
- warm amber accent for active state
- hard-edged framed layout
- hardware-style, retro-modern display feel

That styling is intentional and should remain the visual baseline while the LCD renderer evolves.
