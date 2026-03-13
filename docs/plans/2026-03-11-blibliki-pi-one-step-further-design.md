# Blibliki Pi One Step Further

**Date:** 2026-03-11
**Status:** Living design draft
**Author:** Mike Zaby

## Overview

Blibliki already has a Pi-oriented runtime in `packages/pi` and Grid-side device registration and patch assignment. The next step is not "run a patch on Raspberry Pi" but "make the Pi feel like a compact standalone instrument".

This document captures the current product direction for that next step. It is intentionally a living draft. It should be updated across future sessions as decisions get validated.

## Product Direction

The long-term direction is closer to a standalone workstation than a simple headless runtime, but development should get there gradually:

1. Keep Grid in the loop early because Grid is already a major strength of Blibliki and the fastest way to author complex patches.
2. Make the Pi feel like an instrument during playback and performance.
3. Gradually add limited on-device editing and workflow operations without trying to recreate the full Grid graph editor on the Pi.
4. Let Grid evolve toward workflow authoring, deep setup, and template creation, while the Pi becomes a focused performance and light-editing surface.

## Design Principles

The Pi experience should feel more like compact hardware instruments such as Elektron Digitakt or Torso S-4 than a generic small computer running a web app.

Working principles:

- Compact hardware footprint. Target display size is roughly `3.5"` to `5"`, but not larger.
- Simple and effective visuals over "fancy UI".
- Monochrome mindset even if the chosen screen is color.
- High contrast, dense information, clear focus states, and immediate readability.
- No dependency on touch interaction for `v1`.
- Controller-first interaction. The display supports the controller, rather than replacing it.
- Architecture must stay extensible so later versions can add patch browsing and minor local editing.

## Current State In The Repository

Current building blocks already exist:

- `packages/pi` can load a device config, initialize Firebase, fetch an assigned patch, load the engine, and start playback.
- Grid already has device registration and patch assignment flows.
- `LaunchControlXL3` already exists as a first-party controller integration in the engine.
- `MidiMapper` already has named `tracks`, an `activeTrack`, per-track mappings, global mappings, and controller value resync behavior.

Current limitations:

- Pi behavior is still deployment-oriented rather than instrument-oriented.
- There is no Pi-specific patch authoring mode in Grid yet.
- There is no Pi display runtime yet.
- Local editing on the Pi is not defined yet.
- Existing `MidiMapper.activeTrack` is not enough by itself for the planned focused-track plus page-navigation model.

## V1 Product Contract

The first serious milestone should be a performance dashboard, not a full local editor.

### Confirmed scope

- Grid remains required for patch authoring and setup.
- A new constrained authoring mode will be added inside Grid.
- That mode will be called `Pi patcher`.
- `Pi patcher` patches will support `1 global` layer plus up to `8 tracks`.
- The LCD starts as a performance dashboard.
- The implementation should be extendable toward browsing and minor local editing later.

### Explicit non-goals for V1

- Full local patch editing
- Replacing the Grid graph editor on the Pi
- Touch-first workflows
- Rendering the full engine graph on the LCD
- Unlimited track counts

## Pi Patcher In Grid

`Pi patcher` should be a constrained mode inside the current Grid, not a separate app and not a separate engine.

The underlying patch should still use the existing Blibliki graph and current infrastructure. The difference is that a Pi patch carries an additional performance contract that the Pi runtime, Launch Control XL3, and LCD understand.

The first version of `Pi patcher` should include:

- At least one starting template
- Pi-specific validation rules
- A global control definition
- A track definition for up to `8` tracks
- LCD-friendly labels and metadata
- Stable controller assignments that are not inferred from the raw graph at runtime

### Why this approach

This is the most gradual path:

- It preserves the value of the current Grid editor.
- It reuses the existing engine and patch model.
- It lets Pi-specific structure grow without forking the product into a second editor too early.
- It gives a clean path from "generic patch" to "performance instrument patch".

## Track Model

For `Blibliki pi`, a track should be an explicit performance concept, not something inferred from the graph.

Recommended definition:

- A track has a name.
- A track exposes a curated set of controller mappings.
- A track has LCD labels and presentation metadata.
- A track may later gain light-editing affordances such as effect selection or modulation assignment.

This should sit above the raw engine graph while still reusing `MidiMapper` as the routing backbone.

### Why not graph-derived tracks

Graph-derived tracks would make the Pi UI fragile and ambiguous. The Pi needs a stable contract, not best-effort inference.

### Why not "MidiMapper track only"

`MidiMapper` provides the right control backbone, but by itself it is too thin for LCD rendering and future local editing. The Pi needs a richer layer that says not only "what CC maps where" but also "what this track is", "what the player should see", and "what the current page means".

## Controller Contract

The Novation Launch Control XL3 should be treated as the primary performance surface.

### Confirmed encoder model

The XL3 has three rows of eight encoders. The planned mapping is:

- Row 1: always-global
- Row 2: upper function block for the currently focused track
- Row 3: lower function block for the currently focused track

The controller should use a focused-track model with fixed functional pages:

- `Track Prev/Next`: change the focused track
- `Page Up/Down`: change the active page

The page contract for `v1` should be fixed:

- Page 1: `Source` / `Amp`
- Page 2: `Filter` / `Mod`
- Page 3: `FX A` / `FX B`

This model should be mirrored by the LCD so the instrument always presents one focused track, one active page, and one always-visible global row.

### Global encoder contract

The first pass should use a hybrid standard:

- Fixed across all Pi patcher patches: `Tempo`, `Main Volume`
- Template-defined: the other `6` global encoder slots

This creates consistency where it matters while leaving room for template specialization later.

### Faders and buttons

Faders and buttons are not yet defined as core `v1` interactions. They should be left available for later template-specific behavior unless a strong `v1` use case emerges.

## LCD Dashboard

The first LCD milestone is a performance dashboard.

The display should not try to behave like a tiny version of Grid. It should instead reinforce the controller contract and answer the most important live questions immediately:

- What patch is currently loaded?
- What is the current tempo and transport state?
- Which track is currently in focus?
- Which page is currently active?
- What are the labels and current values for the visible global and track controls?
- What is changing right now?

### Visual direction

The UI should be designed with a monochrome mindset:

- High contrast
- Low visual noise
- Strong hierarchy
- Clear labels
- Dense but legible information
- Minimal decorative color, even if the screen supports full color

The goal is hardware feel, not general-purpose touchscreen feel.

### V1 dashboard content

Likely elements:

- Patch name
- Device status
- Tempo
- Transport/play state
- Focused track name
- Active page name
- Global row labels and values
- Visible parameter labels and values for the current page
- A clear highlight for the most recently touched control

Potential additions if they fit cleanly:

- Simple meters
- Clock or bar/beat display
- Selected template name

## Display Hardware Direction

The display target is compact: roughly `3.5"` to `5"`.

The current recommendation is to prefer `DSI` first and treat touch support as optional rather than required. Even if the chosen panel includes touch, the software should not depend on touch in `v1`.

### Candidate direction

- Preferred class: compact `DSI` display
- Acceptable size: `3.5"` to `5"`
- Preferred UX: landscape, high contrast, readable from playing distance

### Candidate panels to evaluate

- `Raspberry Pi Touch Display 2` (`5"`, DSI) as the strongest "official and supported" candidate
- `Waveshare 3.5inch DSI LCD (H)` as a more compact alternative

An HDMI screen is acceptable only if DSI creates unexpected software or integration problems.

### Hardware selection criteria

- Raspberry Pi 5 compatibility
- Stable Raspberry Pi OS support
- Mounting simplicity
- Readability at instrument distance
- Fast boot and reliable startup
- Clean cable and enclosure story

## Software Rendering Direction

The display software should be implemented in a way that supports growth beyond a passive dashboard.

Recommended direction:

- Run a local Pi UI surface dedicated to the LCD
- Feed that UI from Pi runtime state rather than from direct graph inspection
- Keep the UI rendering layer separate from the audio engine runtime
- Design the state model so later features can add browsing and minor editing without rewriting the whole screen stack

### Working architectural split

1. Grid authors a `Pi patcher` patch and stores Pi-specific metadata.
2. Pi runtime loads the patch and starts the engine.
3. A Pi state adapter exposes the currently relevant performance state:
   - patch info
   - transport state
   - focused track
   - active page
   - global and track slot labels
   - current values
   - recent interaction focus
4. The LCD renderer consumes that state and paints the dashboard.

This split matters because the display should render an intentional performance model, not reverse-engineer the raw engine graph on every frame.

## Conceptual Pi Patcher Data Layer

The exact schema is not decided yet, but the shape should look roughly like this:

```ts
type PiPatcherConfig = {
  templateId: string;
  globals: PiGlobalSlot[];
  tracks: PiTrack[];
  ui: {
    displayMode: "dashboard";
    visualTheme: "mono-contrast";
  };
};

type PiGlobalSlot = {
  slot: number;
  label: string;
  fixed?: boolean;
  mapping: unknown;
};

type PiTrack = {
  id: string;
  name: string;
  slots: PiTrackSlot[];
};

type PiTrackSlot = {
  slot: number;
  label: string;
  mapping: unknown;
};
```

This is not a final API. It is a direction: Pi patcher needs an explicit performance-layer schema that can be validated in Grid and consumed by the Pi runtime.

## Required Engine And Runtime Extensions

This section summarizes the likely gaps implied by the current design.

### Grid

- Add `Pi patcher` mode or patch metadata
- Add template support
- Add Pi-specific validation
- Add authoring UI for global slots and track slots
- Add LCD-friendly labels and preview metadata

### Engine / mapping layer

- Reuse `MidiMapper` track logic as the control backbone
- Introduce a concept of focused-track page navigation
- Define how controller navigation updates focused track and active page
- Keep controller feedback synchronized with the current page of the current track

### Pi runtime

- Load Pi-specific patch metadata
- Bind controller state to the Pi patcher model
- Expose performance state for the LCD renderer
- Start reliably as an appliance-like runtime

### Display runtime

- Render the dashboard
- Handle focus changes from controller interaction
- Stay decoupled enough to support later local browsing/editing

## Validation And Failure Modes

`Pi patcher` needs explicit validation because the instrument workflow depends on predictable structure.

Examples:

- Reject more than `8` tracks
- Require exactly `1` global layer
- Require `Tempo` and `Main Volume` in fixed global slots
- Validate track slot labels and mappings
- Validate template requirements
- Warn when a template declares slots that are not fully mapped

The Pi runtime should fail clearly when Pi-specific metadata is missing or invalid, instead of trying to infer behavior from an arbitrary patch.

## Testing Strategy

The initial implementation should be tested at three levels:

### Grid authoring tests

- Template creation and selection
- Pi patch validation rules
- Track/global slot assignment rules
- Serialization of Pi patch metadata

### Engine/controller tests

- Focused track navigation behavior
- Page navigation behavior
- Controller feedback updates when track or page changes
- Global row stability across track and page navigation
- Sync behavior between `MidiMapper` values and controller state

### Pi runtime / LCD tests

- Patch load with Pi metadata
- State adapter output for the dashboard
- Correct labels and values for visible rows
- Focus updates when controls are touched
- Graceful behavior when a track slot mapping is invalid or missing

## Phased Roadmap

### Phase 0: Current state

- Pi loads assigned patches from Grid
- No Pi-specific patch authoring mode
- No LCD runtime
- Controller support exists but is generic relative to the desired instrument UX

### Phase 1: Pi patcher performance instrument

- Add `Pi patcher` mode in Grid
- Add one starting template
- Define `1 global + up to 8 tracks`
- Implement fixed global slots for `Tempo` and `Main Volume`
- Bind XL3 encoder rows to `global + focused-track fixed pages`
- Render LCD performance dashboard

### Phase 2: Richer performance system

- More templates
- Better dashboard layouts
- Stronger controller feedback
- Possible use of faders/buttons
- Better patch/device browsing on Pi

### Phase 3: Minor local editing

- Limited effect selection
- Limited routing operations such as attaching an LFO to a filter frequency
- Limited workflow edits that do not require the full graph editor

### Phase 4: Grid as workflow authoring

Grid remains the deep setup tool, but the Pi becomes a more complete instrument with stronger local control over day-to-day use.

## Working Recommendations From This Session

These are recommendations made during brainstorming and accepted as the current working direction:

- Use a constrained `Pi patcher` mode inside the existing Grid
- Keep Grid in the loop early
- Treat `track` as an explicit performance concept
- Reuse `MidiMapper` as the routing backbone
- Use a fixed global row plus a focused-track fixed-page controller model
- Start with a performance dashboard, not local editing
- Favor compact DSI displays and design the LCD with a monochrome mindset

## Open Questions For Next Session

The following questions should be revisited in later sessions so context is not lost:

1. What exactly is the first `Pi patcher` template?
2. Which six non-fixed global slots should the first template expose?
3. What are the exact eight slot definitions for each functional block?
4. What should the first LCD layout actually look like in pixels and zones?
5. Should the dashboard be landscape-only?
6. What rendering stack should drive the LCD UI on the Pi?
7. What should the startup experience be on the Pi beyond auto-loading the assigned patch?
8. Do faders get a `v1` role such as track volume, sends, or macros?
9. Do buttons get a `v1` role such as mute, solo, select, page, or shift behavior?
10. How should focused-track page navigation be represented relative to existing `MidiMapper.activeTrack` behavior?
11. How should Pi-specific metadata be stored in the patch model and validated in Grid?
12. What exact information should the LCD show when a control is touched?
13. Are simple meters worth the space in `v1`, or should the first dashboard stay purely symbolic and textual?
14. Which screen should actually be purchased after comparing readability, mounting, and software support on Raspberry Pi 5?
15. When local editing arrives, what is the smallest useful editing action to support first?

## Purchase Research Notes

Because the display choice will affect both hardware packaging and rendering constraints, the screen decision should be verified before implementation work starts.

Current candidates referenced during brainstorming:

- Raspberry Pi Touch Display 2:
  `https://www.raspberrypi.com/documentation/accessories/touch-display-2.html`
- Waveshare 3.5inch DSI LCD (H):
  `https://www.waveshare.com/3.5inch-dsi-lcd-h.htm`

These should be re-checked before purchase in case product availability or compatibility guidance changes.
