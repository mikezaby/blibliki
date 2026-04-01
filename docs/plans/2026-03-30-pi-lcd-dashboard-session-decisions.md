# Blibliki Pi LCD Dashboard Session Decisions

**Date:** 2026-03-30
**Status:** Updated working decisions after the OSC architecture follow-up

## Overview

This note captures the LCD-related design direction agreed during the dashboard discussions and the later architecture follow-up.

The immediate question was not "how do we build the final Raspberry Pi LCD stack?" but "what should the first implementation slice validate?" The repository already contained a Pi-side mock screen in `packages/pi`, so the original decision focus was whether that mock should remain a debug dump, become the main dashboard prototype, or be skipped in favor of a real LCD runtime spike.

That first question is now settled. The terminal dashboard remains the prototype surface, but the real renderer architecture has also been clarified: the Pi runtime and the LCD renderer should be separate services communicating over a versioned OSC contract.

## Agreed Direction

### 1. Terminal ASCII is valid for the first prototype phase

ASCII in the terminal is good enough to validate the first dashboard contract:

- `header + 3 bands`
- fixed `8-slot` rows
- visible empty and inactive slots
- label and value formatting
- in-place updates when track, page, or control values change
- the overall controller-first information model

This should be treated as a development mock for the LCD, not as the LCD itself.

### 2. The existing mock screen should be upgraded, not discarded

The repository already has a mock display path. The recommended move is to promote that existing mock into the official dashboard prototype instead of introducing a second mock path or jumping directly to the final hardware renderer.

The current mock is useful as a debug output, but it does not yet behave like the intended LCD dashboard. The first implementation slice should make it reflect the real dashboard structure.

### 3. `InstrumentDisplayState` remains the internal semantic model, not the wire contract

The current display-state model is still the right seam inside the runtime layer, but it should no longer be treated as the cross-process renderer contract.

The clarified split is:

- `InstrumentDisplayState` for internal runtime meaning
- `DisplayProtocolState` for renderer-facing transport and UI state

The terminal mock can still be derived from the same runtime state, but the independent display service should receive a renderer-ready protocol model rather than raw runtime state.

### 4. The real renderer should be an independent process, not a child process

The Pi runtime should not own the display process lifecycle. The agreed architecture is:

- `blibliki-pi` runs as one service
- `pi-display` runs as another service
- both communicate over localhost using a versioned OSC protocol

This is cleaner than parent-child stdio because startup, restart, and debugging become independent.

### 5. The first real renderer should be TypeScript + Slint, with Pi validation early

The first real LCD app should stay in the monorepo and use TypeScript so it can share types and development workflow with the rest of the codebase.

The expected path is:

- desktop windowed validation first
- then very early Raspberry Pi no-X validation

If `slint-node` proves unreliable on Pi later, the OSC contract should survive and only the renderer implementation should change.

### 6. The transport contract should be OSC with full snapshots first

The renderer protocol should use OSC addresses under `/blibliki/v1/...`.

For `v1`:

- `full` snapshots are canonical
- section-level partials such as `header` or `band/global` are allowed
- arbitrary property patches are not allowed
- every state message carries a monotonic `revision`
- the display can request a fresh full snapshot on startup or reconnect

## What The Terminal Mock Should Validate

The upgraded mock dashboard should prove:

- the header content
- the global band content
- the upper and lower page-band content
- stable slot footprints across all `8` visible positions
- handling of performance mode and `Seq Edit`
- live updates from runtime state changes

The terminal mock should aim to mirror the LCD structure closely enough that it becomes the main design-feedback tool until the real Pi renderer exists.

## What The Terminal Mock Cannot Validate

The terminal mock is not enough to validate:

- final readability on `3.5"` or `5"` hardware
- typography, spacing, and visual hierarchy on the real screen
- encoder arcs, rings, or graphical indicators
- final `DRM/KMS` rendering behavior
- boot-time appliance integration on Raspberry Pi

Those concerns belong to the later real LCD renderer phase.

## Recommended Implementation Sequence

### Phase 1: Shared contract plus terminal dashboard

- keep `InstrumentDisplayState` as the internal runtime model
- upgrade the existing mock screen to a real dashboard-style layout
- add tests that lock performance and `Seq Edit` rendering
- use that mock for local iteration and design review

### Phase 2: Shared display protocol plus independent renderer

- add `DisplayProtocolState` as the renderer-facing contract
- define the OSC message set
- make `blibliki-pi` publish display snapshots over OSC
- make `pi-display` listen and render independently

### Phase 3: Pi validation

- validate the same renderer on desktop and Raspberry Pi
- test `linuxkms` without X/Wayland
- confirm readability on the actual target display hardware

This sequence keeps the design work grounded while still moving toward the intended final architecture.

## Open Questions

The following were left open:

- whether TypeScript Slint is sufficient on Raspberry Pi long term
- the exact OSC library choice for Node
- the final pixel-level layout tuning for `1280x720` versus `800x480`
- whether later versions need finer-grained partial updates than section-level messages

## Summary

The agreed direction is:

- use the existing mock screen as the basis for the LCD prototype
- make the terminal mock resemble the real dashboard instead of a debug dump
- keep `InstrumentDisplayState` as the internal runtime model
- add `DisplayProtocolState` as the renderer contract
- run Pi and display as independent services
- use OSC over localhost for the renderer transport
- start with full snapshots and optional section updates
- build the first real renderer in TypeScript + Slint and move onto Pi quickly
