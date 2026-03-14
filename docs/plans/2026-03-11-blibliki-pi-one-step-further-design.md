# Blibliki Pi One Step Further

**Date:** 2026-03-11
**Status:** Living design draft
**Author:** Mike Zaby

## Overview

Blibliki already has a Pi-oriented runtime in `packages/pi` and Grid-side device registration and patch assignment. The next step is not "run a patch on Raspberry Pi" but "make the Pi feel like a compact standalone instrument".

This document captures the current product direction for that next step. It is intentionally a living draft. It should be updated across future sessions as decisions get validated.

## Document Map

- Product Foundation
- Pi Patcher Model
- Track Page Blocks
- Display And Hardware
- Runtime Architecture
- Validation And Delivery
- Open Questions

## Product Foundation

### Product Direction

The long-term direction is closer to a standalone workstation than a simple headless runtime, but development should get there gradually:

1. Keep Grid in the loop early because Grid is already a major strength of Blibliki and the fastest way to author complex patches.
2. Make the Pi feel like an instrument during playback and performance.
3. Gradually add limited on-device editing and workflow operations without trying to recreate the full Grid graph editor on the Pi.
4. Let Grid evolve toward workflow authoring, deep setup, and template creation, while the Pi becomes a focused performance and light-editing surface.

### Design Principles

The Pi experience should feel more like compact hardware instruments such as Elektron Digitakt or Torso S-4 than a generic small computer running a web app.

Working principles:

- Compact hardware footprint. Target display size is roughly `3.5"` to `5"`, but not larger.
- Simple and effective visuals over "fancy UI".
- Monochrome mindset even if the chosen screen is color.
- High contrast, dense information, clear focus states, and immediate readability.
- No dependency on touch interaction for `v1`.
- Controller-first interaction. The display supports the controller, rather than replacing it.
- Architecture must stay extensible so later versions can add patch browsing and minor local editing.

### Current State In The Repository

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

### V1 Product Contract

The first serious milestone should be a performance dashboard, not a full local editor.

#### Confirmed scope

- Grid remains required for patch authoring and setup.
- A new constrained Pi patcher authoring surface will be added in the Grid app.
- That authoring surface will be called `Pi patcher`.
- `Pi patcher` patches will support `1 global` layer plus up to `8 tracks`.
- The LCD starts as a performance dashboard.
- The implementation should be extendable toward browsing and minor local editing later.

#### Explicit non-goals for V1

- Full local patch editing
- Replacing the Grid graph editor on the Pi
- Touch-first workflows
- Rendering the full engine graph on the LCD
- Unlimited track counts

## Pi Patcher Model

### Pi Patcher In Grid

`Pi patcher` should live inside the Grid app ecosystem, but it should not be squeezed into the current freeform Grid patch document model.

Instead, it should have its own constrained authoring surface and its own document model. That document should generate an engine patch for runtime use. This keeps Pi patcher in the same product and infrastructure world without forcing it into the same storage and authoring shape as the freeform graph editor.

The first version of `Pi patcher` should include:

- At least one starting template
- Pi-specific validation rules
- A global control definition
- A track definition for up to `8` tracks
- LCD-friendly labels and metadata
- Stable controller assignments that are not inferred from the raw graph at runtime

#### Why this approach

This is the most gradual path:

- It preserves the value of the current Grid app and infrastructure.
- It reuses the existing engine and patch runtime.
- It avoids making the already-bloated Grid patch document even fatter.
- It gives Pi patcher room to become a proper constrained instrument authoring system.

### Track Model

For `Blibliki pi`, a track should be an explicit performance concept, not something inferred from the graph.

Recommended definition:

- A track has a name.
- A track exposes a curated set of controller mappings.
- A track has LCD labels and presentation metadata.
- A track may later gain light-editing affordances such as effect selection or modulation assignment.

This should sit above the raw engine graph while still reusing `MidiMapper` as the routing backbone.

#### Why not graph-derived tracks

Graph-derived tracks would make the Pi UI fragile and ambiguous. The Pi needs a stable contract, not best-effort inference.

#### Why not "MidiMapper track only"

`MidiMapper` provides the right control backbone, but by itself it is too thin for LCD rendering and future local editing. The Pi needs a richer layer that says not only "what CC maps where" but also "what this track is", "what the player should see", and "what the current page means".

### Controller Contract

The Novation Launch Control XL3 should be treated as the primary performance surface.

#### Confirmed encoder model

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

#### Global encoder contract

The first pass should use a hybrid standard:

- Fixed across all Pi patcher patches: `Tempo`, `Main Volume`
- First-template defaults for the other slots: `Swing`, `Master Filter Cutoff`, `Master Filter Resonance`, `Reverb Send`, `Delay Send`, one intentionally inactive slot, with `Main Volume` fixed at the final encoder position

This creates consistency where it matters while leaving room for template specialization later. The first template should treat these controls as a patch-wide performance strip rather than deep editing controls. The exact first-pass order should be:

1. `Tempo`
2. `Swing`
3. `Master Filter Cutoff`
4. `Master Filter Resonance`
5. `Reverb Send`
6. `Delay Send`
7. `inactive`
8. `Main Volume`

The row should stay absolutely stable across all pages and tracks in `v1`.

The first-pass LCD abbreviations for that row should be:

1. `BPM`
2. `SWG`
3. `MCF`
4. `MRQ`
5. `REV`
6. `DLY`
7. `---`
8. `VOL`

#### Fader layer

The faders should form a permanent mixer layer in `v1`. Each of the `8` tracks should end with a dedicated final `Gain` module, and that module should be the target of the corresponding hardware fader.

This gives the controller a stable mixer contract:

- `Fader 1` controls the final output gain of `Track 1`
- `Fader 2` controls the final output gain of `Track 2`
- and so on through `Track 8`

This mapping should never change with focused track or active page. The encoder rows remain page-based and focused-track based, while the faders remain a fixed top-level performance mixer.

For `v1`:

- No dedicated LCD feedback is required for fader movement
- No special controller feedback is required
- Faders should use immediate takeover, not pickup behavior

#### Button layer

The button layer in `v1` should stay narrow and deliberate. Buttons should be used primarily for transport and navigation:

- `Play/Stop` as a single toggle action
- `Track Prev/Next`
- `Page Prev/Next`

Both track and page navigation should wrap around at the ends. `Shift` should not exist in `v1`. It should only be introduced when there is a real second-layer behavior to justify it.

#### Focus state model

The focused-track and page system should build directly on existing `MidiMapper` concepts where possible:

- `MidiMapper.activeTrack` should become the practical meaning of the focused Pi track
- `activePage` should live in the Pi patcher controller/UI layer

The encoder rows and LCD both follow the combined state of `activeTrack + activePage`. The faders do not participate in that focus model because they remain permanently mapped to all eight final track gains.

### First Template Direction

The first `Pi patcher` template should be a generic `8-track` performance instrument. It is not intended to validate one narrow musical use case. It is intended to validate the Pi authoring model, the controller contract, the LCD dashboard, and the broader idea that Grid can author an instrument-oriented patch for the Pi.

This first template should assume:

- Up to `8` tracks
- `1` global layer
- Fixed focused-track pages
- One source profile per track
- Pi patcher remains responsible for constrained instrument authoring while the generated engine patch remains the runtime artifact

The first template should not try to solve every kind of source workflow. It only needs enough range to prove that the profile system works and that the Pi can feel like a coherent instrument.

### First Template Initialization

The first generic `Pi patcher` template should stay role-neutral. It should not suggest musical archetypes such as bass, lead, or pad, because that would make the starting point feel less blank than intended. If users want a more guided starting point, that should come from separate starter patches or future curated templates, not from the base template itself.

For that reason, the template should be created with all `8` tracks generated immediately. This keeps the controller and LCD contract stable from the first moment and avoids making the instrument model depend on track creation state.

Those `8` tracks should begin in a truly blank state:

- the track exists structurally
- the fixed pages exist structurally
- no source profile is assigned yet

A track becomes meaningful only when the user selects a source profile in Pi patcher and starts defining its pages and mappings. The template should provide the frame of the instrument, not pre-decide its content.

### Pi Patcher As Constrained Authoring

`Pi patcher` should let the user perform a defined set of musical actions, not arbitrary engine-patch editing. It should be a constrained authoring system built around template rules.

In `v1`, those actions should include:

- choosing a source profile for a track
- choosing which effects occupy the four FX slots
- choosing modulation target presets
- naming tracks
- setting initial values for globals and page slots

From those constrained choices, `Pi patcher` should generate the corresponding engine patch structure. This is why the conversion is one-way: a Pi patcher document can generate a valid engine patch, but a generic Grid patch cannot be loaded into Pi patcher because it does not guarantee the required template structure.

### Pi Patcher Document Ownership

The `Pi patcher` document should be the source of truth for Pi-instrument authoring. It should own:

- the chosen template
- track names
- source profile and FX selections
- page slot content
- globals
- controller/display metadata
- startup values

The generated `engine patch` should be treated as a derived artifact. Its job is to run the instrument, not to serve as the primary authored model.

This means `Pi patcher` should not be embedded into the already-bloated stored Grid patch model. The cleaner long-term split is:

- `engine patch` as pure runtime graph data
- `grid patch` as freeform graph-editor data
- `pi patcher document` as constrained instrument-authoring data

For `v1`, the output relationship should stay simple:

- `Pi patcher document` in
- `engine patch` out

No generated Grid artifact is needed in `v1`.

### First Pi Patcher Workflow

The first Pi patcher workflow should begin with `template creation`, not with free patch construction. In `v1`, there should be exactly `one` template available, but the model should allow more templates later.

Once the template is chosen, the structure should already be fixed:

- the global row
- the focused-track controller model
- the fader mixer layer
- the page contract
- the LCD dashboard structure

The user should not edit that structure in `v1`. Instead, they should edit the content inside it:

- source profiles
- effects
- modulation target presets
- names and labels
- initial values

The template is the instrument chassis, and the user fills it with musical content.

### Initial State Editing

The `Pi patcher` document should own the initial playable state of the instrument, but the authoring experience for that state should stay aligned with the hardware rather than exposing a low-level property table.

Startup values should be edited in a slot-oriented way:

- through the global row
- through the focused track pages
- through the same conceptual slot structure that exists on the instrument

At this stage, the exact storage representation of missing or inactive values does not need to be locked. What matters in the design is that `Pi patcher` owns the startup state and that the editing UI mirrors the same structure the player will later use on the hardware.

### Track Identity And Naming

Track identity in `v1` should be fixed by position. The eight tracks are not reorderable in the first version. They are stable positions in the instrument: `Track 1` through `Track 8`.

The user can still give each track a musical name, but that name should be additive rather than replacing the structural identity of the track. In practice:

- every track always shows its ordinal label
- an optional custom name can be appended after it
- example: `Track 1: Pad`

If the user does not provide a custom name, the track remains simply `Track 1`. The same combined label should be used consistently in Pi patcher and on the LCD.

### Patch And Blank-Track States

The patch itself should always have a name. In `v1`, that name should always exist, and the default should be `Untitled`.

The template name does not need to appear on the `v1` LCD. Template selection is an authoring concern, not part of the live-performance context the player needs during use.

Blank tracks should remain visible as real tracks even before they are configured. If a track has no source profile assigned yet, it should still exist as a normal track slot. Its page slots can remain inactive, but the track itself should not disappear.

When such a track is focused:

- the normal combined track label remains visible
- a small `Unassigned` status cue can make the state explicit

For `v1`, track state should stay simple:

- assigned
- unassigned

No separate enabled/disabled flag is needed.

## Track Page Blocks

### Block Overview

The fixed page contract for `v1` is:

- Page 1: `Source` / `Amp`
- Page 2: `Filter` / `Mod`
- Page 3: `FX A` / `FX B`

The detailed design work is now defined for all six blocks at a first-pass level. Later sessions should refine labels, exact parameter mappings, authoring UX in Pi patcher, and LCD presentation.

### Source

#### Source Block

The `Source` block for `v1` should be intentionally conservative. The source type is chosen in Pi patcher, not on the Pi, and the Pi `Source` page only controls the already-selected source. This keeps the first prototype focused on performance rather than dynamic graph mutation. It also avoids designing around source types that do not exist yet, such as `FM` and `Sampler`.

The `Source` page itself should always expose `8` fixed slot positions, but the meaning of those slots depends on the selected source profile. Some source types may not need all eight controls in `v1`, and that is acceptable. Unused slots should remain explicitly inactive on both the controller and LCD rather than being filled with weak or arbitrary controls.

#### Source Profiles Instead Of Single Modules

The `Source` concept in `Pi patcher` should not be limited to a single engine module. That would make simple source types like `Noise` or `Wavetable` fit naturally, but it would block an important real-world case very early: a traditional subtractive voice built from multiple oscillators.

For that reason, `v1` should introduce a Pi-level `source profile` concept above the raw engine graph. A source profile is a named performance abstraction for a track. It defines what the player sees on the `Source` page and how those eight source slots map onto one or more underlying modules.

Examples:

- `Osc` profile = one oscillator module
- `3-Osc` profile = three oscillator modules plus supporting mix structure
- `Noise` profile = one noise generator plus optional supporting source-shaping modules
- `Wavetable` profile = one wavetable module

This approach gives `Blibliki pi` enough expressive power to feel like a real instrument without forcing a new engine abstraction immediately. Long term, if one profile such as `3-Osc` becomes central enough, it can later be promoted into a first-class engine module or macro abstraction.

#### Initial Source Profiles

The first template should define exactly these source profiles:

- `Osc`
- `3-Osc`
- `Noise`
- `Wavetable`

This is enough to validate the profile system without spreading `v1` too thin. `FM` and `Sampler` can be added later after they exist in the engine.

#### Common Source Slot Contract

`Pi patcher` should define `source profile families`. In `v1`, `Osc`, `3-Osc`, and `Wavetable` belong to the same family because they share important pitched-source actions such as `octave`, `coarse`, and `fine`.

Those actions should live in fixed slot positions across that family whenever possible. This gives the instrument stronger physical memory: the player learns where pitch-related controls live and can move between these source types without relearning the page.

The internal behavior can still differ. For example, `3-Osc` may distribute tuning behavior across multiple oscillators, while `Wavetable` may apply the same slots to a single wavetable voice.

`Noise` can remain outside that family, because it does not naturally share the same pitched-source model. A future `Sampler` should also be allowed to define a different layout if its useful controls are fundamentally different.

The common-family contract for `v1` should stay intentionally small:

- `Octave`
- `Coarse`
- `Fine`

These common slots are fixed within compatible source families, not globally across every possible future source profile.

#### 3-Osc As A Macro Instrument

`3-Osc` should not be exposed as direct editing of three separate oscillators on the Pi. That would consume the available slots too quickly and produce a cramped, technical workflow. The better `v1` design is to treat `3-Osc` as a macro subtractive voice.

The player should control musical behaviors such as detune spread, interval relationships, blend, and support-oscillator roles, not the full internal graph. This still allows traditional subtractive behaviors such as stacked detune, fifth-up or fifth-down voicing, octave layering, or using the third oscillator as a bass enhancer.

This matches the broader Pi strategy: Grid remains the place for deep structure, while the Pi exposes a focused performance layer.

#### Macro Depth By Profile

Not every source profile should have the same abstraction depth. In `v1`, only `3-Osc` needs to behave as a strongly macro-oriented source. `Osc` and `Wavetable` should stay much closer to their underlying engine module props, because the existing module models already map cleanly to a source page.

This means Pi patcher should allow source profiles with different internal mapping strategies while still fitting the same outer `8-slot` controller contract:

- some profiles are mostly direct wrappers around one module
- some profiles are curated performance abstractions over multiple modules

That flexibility is important because it lets the instrument stay simple where the engine already provides a clean model, while still supporting more complex source designs when the musical workflow demands it.

#### Noise As A Curated Source Profile

`Noise` should not be limited to a bare one-parameter wrapper around the current `Noise` module. That would make the `Source` page too thin and waste most of the available control surface.

For `v1`, `Noise` should be allowed to behave as a small curated source profile that may include supporting modules around the core noise generator, as long as the result still reads as one coherent source identity. In practice, that means the profile can expose controls such as `noise type` plus a few source-shaping macros like `color`, `texture`, `motion`, or `stereo behavior`, even if those macros are implemented through additional helper modules in the underlying graph.

The important boundary is that the `Source` page must stay about source character, not spill into other blocks. `Level` belongs to `Amp`, general filter shaping belongs to `Filter`, and ambience belongs to `FX`.

#### First-Pass Source Profile Maps

The first-pass source profile maps for the initial template should be:

- `Osc` = `Wave`, `unused`, `Octave`, `Coarse`, `Fine`, `unused`, `unused`, `unused`
- `3-Osc` = `Shape`, `Stack Mode`, `Octave`, `Coarse`, `Fine`, `Spread`, `Blend`, `Sub Role`
- `Noise` = `Type`, `Color`, `Texture`, `unused`, `unused`, `Motion`, `Stereo`, `unused`
- `Wavetable` = `Table`, `Position`, `Octave`, `Coarse`, `Fine`, `unused`, `unused`, `unused`

These are not final labels or final parameter mappings, but they are strong enough to anchor the template, LCD layout, and authoring model.

### Amp

The `Amp` half of Page 1 should behave like an expressive amplitude block rather than a minimal utility section. Its job is to define how a track speaks, how it sits in space, and how it responds to playing dynamics.

For `v1`, the first-pass `Amp` layout should be:

- `Level`
- `Attack`
- `Decay`
- `Sustain`
- `Release`
- `Pan`
- `Retrigger`
- `Velocity`

The first five controls establish the expected amplitude-envelope workflow and give the track an immediately familiar synth voice shape. `Pan` is worth including because it adds clear musical placement without leaking into `FX`.

`Retrigger` is also an important control because it changes how the envelope behaves under repeated note attacks, which strongly affects playing feel. It should allow the user to choose whether the envelope restarts from zero on each attack or continues from the current level.

`Velocity` is a strong final slot because it makes tracks feel more performance-sensitive instead of static. It gives the player a way to decide whether a track behaves dynamically or more like a fixed-level machine.

The `Amp` page should be shared across all source profiles in the first template. This is one of the few blocks that should stay stable whether the track uses `Osc`, `3-Osc`, `Noise`, or `Wavetable`.

### Filter

The `Filter` half of Page 2 should assume one main filter identity per track, even if the underlying Grid patch is more complex. The Pi should expose one clear filter block, not multiple competing filter layers. That keeps the page understandable and gives the player one stable place to shape the tone of a track.

For `v1`, the first-pass `Filter` layout should be:

- `Cutoff`
- `Resonance`
- `Type`
- `Amount`
- `Attack`
- `Decay`
- `Sustain`
- `Release`

This is intentionally a mostly direct filter page. It should expose the familiar synth concepts first, rather than hiding them behind broad macros. `Cutoff`, `Resonance`, and `Type` establish the main filter identity. `Amount` defines how strongly the filter envelope affects the cutoff, and the remaining four slots give the track a dedicated filter envelope.

This page should be shared across all source profiles in the first template. Even if `Osc`, `3-Osc`, `Noise`, and `Wavetable` use the filter differently under the hood, the Pi should keep one stable filter page contract across all of them.

### Mod

The `Mod` half of Page 2 should be an `LFO-oriented modulation block`, not a full modulation matrix editor. In `v1`, each track should have up to `4` available LFO slots, but the Pi should edit only one selected LFO at a time.

For `v1`, the first-pass `Mod` layout should be:

- `LFO Select`
- `Targets`
- `Waveform`
- `Freq`
- `Offset`
- `Amount`
- `Sync`
- `Phase`

`LFO Select` chooses which of the four available LFO slots is currently being edited. `Freq` should be a smart rate control: when `Sync` is off it controls frequency in `Hz`, and when `Sync` is on it controls musical division. This already matches the broad direction of the current engine LFO behavior.

`Targets` should not mean a free-form target picker on the Pi. Instead, the data model should support a real modulation matrix underneath, while the Pi surface chooses a named destination preset for the currently selected LFO. That keeps the architecture open for a deeper modulation system later without turning the first Pi UI into a matrix editor.

Example target presets:

- `Off`
- `Pitch`
- `Filter`
- `Pitch + Filter`
- `Pan`
- `FX Mix`
- `Custom 1`
- `Custom 2`

The `Mod` page should be shared across all source profiles in the first template. Targets can differ per track, but the page structure should stay stable.

### FX A / FX B

The `FX` page should be compact and performance-oriented. In `v1`, each track should support `4` effect slots total, arranged across the two halves of Page 3. `FX A` should host `2` compact effect slots and `FX B` should host `2` compact effect slots. Each compact effect gets `4` controls, so the full page still uses the entire `16-control` surface while allowing four effects per track.

The slots should be fixed by position, not by role. Grid decides which effect type is loaded into each slot, and the Pi only edits the loaded effect. This follows the same pattern used for `Source`.

For `v1`, the allowed effect pool should be:

- `Reverb`
- `Delay`
- `Chorus`
- `Distortion`

Each of these effects must fit a curated `4-control` performance map, even if the underlying module exposes more parameters internally. Extra effect detail can remain in Pi patcher authoring rather than on the hardware surface.

The physical packing should be:

- `FX A`, left effect = slots `1-4`
- `FX A`, right effect = slots `5-8`
- `FX B`, left effect = slots `1-4`
- `FX B`, right effect = slots `5-8`

Whenever an effect has `Mix`, it should live in the `4th` slot of that compact effect map. That gives the entire FX system a stable muscle-memory convention.

First-pass effect performance maps:

- `Delay` = `Time`, `Sync`, `Feedback`, `Mix`
- `Reverb` = `Type`, `Decay`, `PreDelay`, `Mix`
- `Chorus` = `Rate`, `Depth`, `Feedback`, `Mix`
- `Distortion` = `Drive`, `Tone`, `unused`, `Mix`

## Display And Hardware

### LCD Dashboard

The first LCD milestone is a performance dashboard.

The display should not try to behave like a tiny version of Grid. It should instead reinforce the controller contract and answer the most important live questions immediately:

- What patch is currently loaded?
- What is the current tempo and transport state?
- Which track is currently in focus?
- Which page is currently active?
- What are the labels and current values for the visible global and track controls?

#### Visual direction

The UI should be designed with a monochrome mindset:

- High contrast
- Low visual noise
- Strong hierarchy
- Clear labels
- Dense but legible information
- Minimal decorative color, even if the screen supports full color

The goal is hardware feel, not general-purpose touchscreen feel.

#### V1 dashboard content

A companion ASCII sketch lives in `docs/plans/2026-03-11-blibliki-pi-one-step-further-display-ascii.md` so the current layout direction can be reviewed quickly without opening a graphics tool.

The first LCD layout should be `landscape-only` and use a `header + 3 bands` structure that mirrors the controller:

- Header
- Global band
- Upper track-page band
- Lower track-page band

Header content:

- Patch name
- Focused track name
- Active page name
- Play/stop state

Band content:

- Full global row labels and values
- Full upper-row labels and values for the current page
- Full lower-row labels and values for the current page

Value rendering rules:

- Prefer formatted musical values over raw engine/debug values
- Show every visible slot at once; do not collapse to only the touched control
- Each slot should aim to show a label, a formatted value, and later a small visual encoder indicator
- Values and encoder visuals should update in place
- No separate focus popup or enlarged value area is needed in `v1`
- Every slot, including inactive ones, should reserve the same visual footprint

Explicit `v1` omissions:

- No visual meters
- No transport position display
- No duplicated BPM in the header because tempo already lives in the global row

### Display Hardware Direction

The display target is compact: roughly `3.5"` to `5"`.

The current recommendation is to prefer `DSI` first and treat touch support as optional rather than required. Even if the chosen panel includes touch, the software should not depend on touch in `v1`.

#### Candidate direction

- Preferred class: compact `DSI` display
- Acceptable size: `3.5"` to `5"`
- Preferred UX: landscape, high contrast, readable from playing distance

#### Candidate panels to evaluate

- `Raspberry Pi Touch Display 2` (`5"`, DSI) as the strongest first prototype display because it is official, Pi 5-friendly, and gives more room while the LCD layout is still evolving
- `Waveshare 3.5inch DSI LCD (H)` as the stronger compactness-oriented option and a likely later fit check against the desired final hardware size

An HDMI screen is acceptable only if DSI creates unexpected software or integration problems.

#### Prototype recommendation

For early experimentation, the safest first buy is the `Raspberry Pi Touch Display 2`. It should reduce integration risk while the software and enclosure ideas are still fluid.

If the project later moves down to `3.5"`, the UI should adapt without major redesign by keeping the same `landscape` layout model, visible control count, and overall screen structure. The adaptation should mostly be a typography, spacing, and label-shortening pass rather than a new UI concept.

#### Hardware selection criteria

- Raspberry Pi 5 compatibility
- Stable Raspberry Pi OS support
- Mounting simplicity
- Readability at instrument distance
- Fast boot and reliable startup
- Clean cable and enclosure story

## Runtime Architecture

### Software Rendering Direction

The display software should be implemented in a way that supports growth beyond a passive dashboard.

Recommended direction:

- Run a local Pi UI surface dedicated to the LCD
- Feed that UI from Pi runtime state rather than from direct graph inspection
- Keep the UI rendering layer separate from the audio engine runtime
- Design the state model so later features can add browsing and minor editing without rewriting the whole screen stack

#### No-desktop display path

The current direction should avoid `X11`, `Wayland`, and browser-kiosk stacks. The Pi should treat the LCD as a normal Linux display driven by the kernel, while the UI process renders through `DRM/KMS`.

Recommended first-pass operating model:

- `Raspberry Pi OS Lite`
- LCD connected over `DSI`
- Boot directly into appliance services
- A dedicated display process rendering through `DRM/KMS`
- `packages/pi` or a sibling runtime process publishing dashboard state to that display process

This keeps the system lightweight and closer to embedded-instrument behavior.

#### Working architectural split

1. The user authors a `Pi patcher` document.
2. `Pi patcher` generates a valid `engine patch`.
3. Pi runtime loads that engine patch and starts the instrument.
4. A Pi state adapter exposes the currently relevant performance state:
   - patch info
   - transport state
   - focused track
   - active page
   - global and track slot labels
   - current values
5. The LCD renderer consumes that state and paints the dashboard.

This split matters because the display should render an intentional performance model, not reverse-engineer the raw engine graph on every frame.

#### Generated-artifact model

The authoring and runtime relationship should be:

- `Pi patcher document` = source of truth for the instrument
- `engine patch` = generated runtime artifact
- no generated Grid artifact in `v1`

That keeps the constrained Pi workflow separate from the freeform Grid editor.

#### Display implementation direction

The exact UI toolkit is not locked yet, but the architecture should assume a dedicated display process rather than rendering inside the main Node runtime. That keeps the no-desktop path realistic and leaves room for implementation in a lower-level UI stack if needed.

### Conceptual Pi Patcher Data Layer

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
  sourceProfileId: string | null;
  pages: Record<string, PiTrackPage>;
};

type PiTrackPage = {
  id: string;
  upper: PiTrackSlot[];
  lower: PiTrackSlot[];
};

type PiTrackSlot = {
  slot: number;
  label: string;
  mapping: unknown;
};
```

This is not a final API. It is a direction: Pi patcher needs its own explicit instrument-authoring schema that can be validated independently and compiled into an engine patch for runtime use.

### Required Engine And Runtime Extensions

This section summarizes the likely gaps implied by the current design.

#### Grid

- Add a dedicated `Pi patcher` authoring surface or route
- Add template support
- Add Pi-specific validation
- Add source profile authoring and mapping metadata
- Add authoring UI for global slots and track slots
- Add LCD-friendly labels and preview metadata
- Generate an engine patch from the Pi patcher document

#### Engine / mapping layer

- Reuse `MidiMapper` track logic as the control backbone
- Introduce a concept of focused-track page navigation
- Define how controller navigation updates focused track and active page
- Keep controller feedback synchronized with the current page of the current track

#### Pi runtime

- Load the generated engine patch
- Bind controller state to the Pi patcher instrument model
- Expose performance state for the LCD renderer
- Start reliably as an appliance-like runtime

#### Display runtime

- Render the dashboard
- Handle focus changes from controller interaction
- Stay decoupled enough to support later local browsing/editing

## Validation And Delivery

### Validation And Failure Modes

`Pi patcher` needs explicit validation because the instrument workflow depends on predictable structure.

Examples:

- Reject more than `8` tracks
- Require exactly `1` global layer
- Require `Tempo` and `Main Volume` in fixed global slots
- Validate source profile ids and page contracts
- Validate track slot labels and mappings
- Validate template requirements
- Warn when a template declares slots that are not fully mapped

The Pi runtime should fail clearly when Pi-specific metadata is missing or invalid, instead of trying to infer behavior from an arbitrary patch.

### Testing Strategy

The initial implementation should be tested at three levels:

#### Grid authoring tests

- Template creation and selection
- Pi patch validation rules
- Source profile selection and serialization
- Track/global slot assignment rules
- Serialization of the Pi patcher document
- Engine-patch generation from Pi patcher input

#### Engine/controller tests

- Focused track navigation behavior
- Page navigation behavior
- Controller feedback updates when track or page changes
- Global row stability across track and page navigation
- Fixed fader mapping to final track gain modules
- Source page label/value updates when the focused track changes
- Sync behavior between `MidiMapper` values and controller state

#### Pi runtime / LCD tests

- Patch load with Pi metadata
- State adapter output for the dashboard
- Correct labels and values for visible rows
- In-place value updates when controls are touched
- Graceful behavior when a track slot mapping is invalid or missing

### Phased Roadmap

#### Phase 0: Current state

- Pi loads assigned patches from Grid
- No dedicated Pi patcher authoring document
- No LCD runtime
- Controller support exists but is generic relative to the desired instrument UX

#### Phase 1: Pi patcher performance instrument

- Add a dedicated `Pi patcher` authoring surface
- Add one starting generic `8-track` template
- Define `1 global + up to 8 tracks`
- Implement the fixed global row with `Tempo`, `Swing`, `Master Filter Cutoff`, `Master Filter Resonance`, `Reverb Send`, `Delay Send`, an intentionally inactive slot, and `Main Volume`
- Implement initial source profiles: `Osc`, `3-Osc`, `Noise`, `Wavetable`
- Implement fixed fader mapping to the final gain stage of all `8` tracks
- Implement transport/navigation buttons for `Play/Stop`, `Track Prev/Next`, and `Page Prev/Next`
- Generate an engine patch from the Pi patcher document
- Bind XL3 encoder rows to `global + focused-track fixed pages`
- Render LCD performance dashboard

#### Phase 2: Richer performance system

- More templates
- Better dashboard layouts
- Stronger controller feedback
- Better patch/device browsing on Pi

#### Phase 3: Minor local editing

- Limited effect selection
- Limited routing operations such as attaching an LFO to a filter frequency
- Limited workflow edits that do not require the full graph editor

#### Phase 4: Grid as workflow authoring

Grid remains the deep setup tool, but the Pi becomes a more complete instrument with stronger local control over day-to-day use.

### Working Recommendations From This Session

These are recommendations made during brainstorming and accepted as the current working direction:

- Treat `Pi patcher` as a constrained authoring system, not a free graph editor
- Keep Grid in the loop early
- Treat `track` as an explicit performance concept
- Reuse `MidiMapper` as the routing backbone
- Use a fixed global row plus a focused-track fixed-page controller model
- Use a permanent `8`-fader mixer layer mapped to final track gains
- Keep buttons narrow: `Play/Stop`, `Track Prev/Next`, `Page Prev/Next`, no `Shift` in `v1`
- Let `MidiMapper.activeTrack` be the focused Pi track and keep `activePage` in the Pi controller/UI layer
- Treat `Source` as a profile abstraction rather than always a single engine module
- Keep the first generic template role-neutral and initialize all `8` tracks immediately
- Use a single fixed template in `v1` with editable content inside a fixed structure
- Treat the Pi patcher document as the source of truth and the engine patch as a generated artifact
- Start with a performance dashboard, not local editing
- Favor compact DSI displays and design the LCD with a monochrome mindset

## Open Questions For Next Session

The following questions should be revisited in later sessions so context is not lost:

1. What should the first LCD layout actually look like in pixels and zones?
2. What display-process stack should drive the LCD UI on the Pi without `X11` or `Wayland`?
3. Should that display process be built with something like `Rust + Slint + LinuxKMS`, `C/C++ + LVGL + DRM/KMS`, or another no-desktop stack?
4. What should the startup experience be on the Pi beyond auto-loading the assigned patch?
5. What exact schema should the Pi patcher document use, and how should it compile into an engine patch?
6. What exact parameter mappings and inactive-slot behavior should each source profile use?
7. How should named modulation target presets be authored and stored in Pi patcher?
8. How should sequencing work across tracks, and how should the instrument balance built-in sequencing such as `StepSequencer` against external input like a MIDI keyboard?
9. Which screen should actually be purchased after comparing readability, mounting, and software support on Raspberry Pi 5?
10. When local editing arrives, what is the smallest useful editing action to support first?

## Purchase Research Notes

Because the display choice will affect both hardware packaging and rendering constraints, the screen decision should be verified before implementation work starts.

Current candidates referenced during brainstorming:

- Raspberry Pi Touch Display 2:
  `https://www.raspberrypi.com/documentation/accessories/touch-display-2.html`
- Waveshare 3.5inch DSI LCD (H):
  `https://www.waveshare.com/3.5inch-dsi-lcd-h.htm`

These should be re-checked before purchase in case product availability or compatibility guidance changes.
