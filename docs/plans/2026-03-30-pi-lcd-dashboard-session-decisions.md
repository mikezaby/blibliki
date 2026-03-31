# Blibliki Pi LCD Dashboard Session Decisions

**Date:** 2026-03-30
**Status:** Working decisions from session

## Overview

This note captures the LCD-related design direction agreed during the session before implementation starts.

The immediate question was not "how do we build the final Raspberry Pi LCD stack?" but "what should the first implementation slice validate?" The repository already contains a Pi-side mock screen in `packages/pi`, so the decision focus was whether that mock should remain a debug dump, become the main dashboard prototype, or be skipped in favor of a real LCD runtime spike.

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

### 3. `InstrumentDisplayState` should remain the single display contract

The current display-state model is the right seam.

The terminal mock and the later real LCD renderer should both consume the same high-level state rather than building separate UI models. This keeps the dashboard logic in one place and lowers the risk of the terminal prototype drifting away from the real Pi display.

### 4. The first slice should not start with Rust/Slint

The design still points toward a future separate LCD process, likely validated with `Rust + Slint + LinuxKMS`, but that should come after the dashboard contract is proven.

Starting with the real LCD stack now would add a large amount of scaffolding before the basic dashboard content and layout rules are locked.

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

- keep `InstrumentDisplayState` as the single UI contract
- upgrade the existing mock screen to a real dashboard-style layout
- add tests that lock performance and `Seq Edit` rendering
- use that mock for local iteration and design review

### Phase 2: Real LCD renderer

- build a separate LCD process
- feed it from the same dashboard state model
- validate hardware readability and rendering behavior on Raspberry Pi

This sequence keeps the design work grounded while still moving toward the intended final architecture.

## Open Questions

The following were left open:

- whether the terminal mock should stay strict ASCII or allow ANSI styling later
- the final pixel-level layout for the real LCD
- the exact hardware purchase decision between candidate DSI panels

## Summary

The agreed direction is:

- use the existing mock screen as the basis for the LCD prototype
- make the terminal mock resemble the real dashboard instead of a debug dump
- keep one shared display-state contract
- delay the real Rust/Slint LCD process until the dashboard contract is stable
