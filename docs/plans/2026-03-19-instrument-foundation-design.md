# Instrument Foundation

**Date:** 2026-03-19
**Last updated:** 2026-03-23
**Status:** Implemented
**Parent document:** [2026-03-11-blibliki-pi-one-step-further-design.md](/Users/mikezaby/projects/blibliki/blibliki/docs/plans/2026-03-11-blibliki-pi-one-step-further-design.md)

## Overview

This document captures the narrowed scope agreed across follow-up design sessions. It still does not try to solve the full `instrument` system. Its job is to define the first foundation that is concrete enough to implement without closing off future instrument experiments.

The immediate goal remains to build from the bottom up around the current `LaunchControlXL3`-oriented design while keeping the authored musical model separate from the physical controller layout.

The current direction also aims to stay philosophically consistent with the engine. In practice that means:

- owner classes manage collections and expose `add/remove/find/serialize` style APIs
- routes use explicit `source` and `destination` plugs
- reusable structures should mirror engine patterns where that makes the instrument layer feel native to the repo

This should mirror patterns from:

- [Engine.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/engine/src/Engine.ts)
- [Route.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/engine/src/core/Route.ts)

## Current Scope

The first implementation slice should stay intentionally small:

- focus on one concrete `Track` implementation built on a reusable `BaseTrack`
- target the current `LaunchControlXL3` page contract
- use `3` controller-facing pages:
  - `sourceAmp`
  - `filterMod`
  - `fx`
- evolve `mod` from placeholder into a first concrete `LfoBlock`
- make `OscBlock` the first concrete source block used to validate the model
- keep `AmpBlock`, `FilterBlock`, effect blocks, and additional source blocks as the expected next concrete implementations

This slice is meant to validate the instrument model, not to complete the full Pi runtime or the final multi-track system.

## Core Model

The current agreed abstractions are:

- `BaseSlot`
- `BaseBlock`
- `BaseTrack`
- `Page`
- `Track`

### Design Boundary

The ownership boundary is now:

- `BaseBlock` owns internal modules, internal routes, exported block inputs/outputs, and exported slots
- `BaseTrack` owns block instances, block-to-block routes, and pages
- `Page` owns only visualization structure and ordered slot references
- `LaunchControlXL3` owns only physical projection to controller pages and rows

This means signal flow lives in the track, not in pages. Pages are only a visualization and slot-exposure abstraction.

### BaseSlot

A slot represents a block-exported control. It is the externalized view of one internal module prop in `v0`.

The slot strategy is now intentionally hybrid:

- keep a shared `BaseSlot`
- allow shared slot helpers only when they remove real duplication
- keep unique slot definitions local to the block that owns them
- do not require a large central slot catalog in `v0`

For `v0`, slot binding should support only direct `module-prop` bindings. Macro-style bindings can be added later when blocks such as `ThreeOscBlock` actually need them.

A technical sketch of `BaseSlot` is:

```ts
type SlotBinding = {
  kind: "module-prop";
  moduleKey: string;
  propKey: string;
};

type BaseSlot = {
  key: string;
  label: string;
  shortLabel: string;
  binding: SlotBinding;
  valueSpec: ValueSpec;
  initialValue?: number | string | boolean;
  inactive?: boolean;
};
```

### BaseBlock

`BaseBlock` should behave like a small owner class similar in spirit to `Engine`.

Each block owns:

- internal module definitions
- internal block routes between those modules
- exported block inputs
- exported block outputs
- exported slots

Blocks should not own live engine module instances in this layer. They should own authored definitions that can later be compiled into engine artifacts.

The base API should mirror engine-style ownership:

- `addModule`
- `updateModule`
- `removeModule`
- `addRoute`
- `removeRoute`
- `findModule`
- `addInput`
- `addOutput`
- `findInput`
- `findOutput`
- `addSlot`
- `removeSlot`
- `findSlot`
- `serialize`

The route model should follow the same explicit `source` / `destination` philosophy used by the engine:

```ts
type BlockPlug = {
  moduleKey: string;
  ioName: string;
};

type BlockRoute = {
  id: string;
  source: BlockPlug;
  destination: BlockPlug;
};
```

Exported block inputs and outputs should exist so the track can connect blocks without knowing about the block’s internal modules.

```ts
type BlockIO = {
  ioName: string;
  kind: "audio" | "midi";
  plug: BlockPlug;
};
```

### BaseTrack

`BaseTrack` is now justified as a real reusable abstraction.

It should behave like the higher-level owner class above blocks:

- own block instances
- own block-to-block routes
- own controller-facing pages
- expose engine-style collection methods

The base API should look like:

- `addBlock`
- `removeBlock`
- `findBlock`
- `addRoute`
- `removeRoute`
- `setPage`
- `findPage`
- `serialize`

Track routes should again use explicit plugs:

```ts
type TrackPlug = {
  blockKey: string;
  ioName: string;
};

type TrackRoute = {
  id: string;
  source: TrackPlug;
  destination: TrackPlug;
};
```

This keeps signal flow in the track rather than making page layout imply routing.

### Track

`Track` is the first concrete track implementation built on `BaseTrack`.

Its current job is to encode the first `LaunchControlXL3`-oriented track shape, not to define the entire future track space.

## Block Inventory

The expected block families remain:

- utility / shared
  - `BaseBlock`
- core voice shaping
  - `AmpBlock`
  - `FilterBlock`
- sources
  - `OscBlock`
  - `WavetableBlock`
  - `NoiseBlock`
  - `ThreeOscBlock`
- effects
  - `ReverbBlock`
  - `DelayBlock`
  - `ChorusBlock`
  - `DistortionBlock`

`OscBlock` remains the first concrete source implementation used to validate the model. The current implementation also includes the additional planned source and effect block families plus a first concrete `LfoBlock` for modulation.

## Page Model

`Page` remains part of the authored track model, not part of the hardware layer. The difference from the earlier draft is that pages are now controller-facing pages rather than six separate semantic page objects.

The current `Track` should own exactly these page keys:

- `sourceAmp`
- `filterMod`
- `fx`

Each page contains regions, and each region contains ordered slot references. Regions preserve page structure, while slot refs preserve exact slot order.

The page shape for `v0` should use fixed top and bottom regions:

```ts
type SlotRef =
  | {
      kind: "slot";
      blockKey: string;
      slotKey: string;
    }
  | {
      kind: "empty";
    };

type PageRegion = {
  position: "top" | "bottom";
  slots: [
    SlotRef,
    SlotRef,
    SlotRef,
    SlotRef,
    SlotRef,
    SlotRef,
    SlotRef,
    SlotRef,
  ];
};

type Page = {
  key: "sourceAmp" | "filterMod" | "fx";
  kind: "split";
  regions: [PageRegion, PageRegion];
};
```

This model is flexible enough to allow:

- one page to expose slots from multiple blocks
- one block to be exposed on multiple pages
- explicit slot ordering controlled by the page rather than by the block

It also keeps block ownership clear:

- blocks own canonical slots
- pages reference slots
- pages do not duplicate slots or own signal flow

### Empty Slots

Each page region should always resolve to exactly `8` visible positions.

If a region does not need all positions, the remaining positions should be filled by a shared page-level empty slot reference:

- `kind: "empty"`

This keeps blocks clean, because blocks do not need fake exported slots just to satisfy controller layout.

## Page Composition

The first concrete page meanings remain:

- `sourceAmp`
  - `top` exposes selected source slots
  - `bottom` exposes amp slots
- `filterMod`
  - `top` exposes filter slots
  - `bottom` exposes the first concrete `LfoBlock`
- `fx`
  - `top` is expected to expose `fx1` and `fx2`
  - `bottom` is expected to expose `fx3` and `fx4`

The physical `LaunchControlXL3` mapping stays aligned with this page model:

- controller page 1 = `sourceAmp`
- controller page 2 = `filterMod`
- controller page 3 = `fx`

## Type-Safety Priority

At this stage, the priority is type safety rather than heavy runtime validation.

That means the design should prefer:

- stable semantic keys
- explicit route shapes
- explicit slot references
- API consistency with the engine

Additional runtime validation can be added later, but it should not dominate the first implementation.

## Folder Direction

The current folder direction is now:

```text
packages/instrument/src/
  slots/
    BaseSlot.ts
  blocks/
    BaseBlock.ts
    AmpBlock.ts
    FilterBlock.ts
    source/
      OscBlock.ts
      WavetableBlock.ts
      NoiseBlock.ts
      ThreeOscBlock.ts
    effects/
      ReverbBlock.ts
      DelayBlock.ts
      ChorusBlock.ts
      DistortionBlock.ts
  pages/
    Page.ts
  tracks/
    BaseTrack.ts
    Track.ts
  hardware/
    launchControlXL3/
      pageMap.ts
```

This structure is still provisional, but it matches the current model well enough for the first implementation pass.

## Implementation Notes

The current implementation now covers the intended foundation slice:

- `BaseSlot`, `BaseBlock`, `BaseTrack`, `Page`, and `Track` are implemented in `packages/instrument`
- the block inventory includes the planned source, filter, amp, effect, and first concrete modulation block families
- the compile boundary from authored track structures to generated engine modules, routes, page metadata, and `MidiMapper` props is implemented
- the runtime patch builder and Pi launcher integration are implemented

The remaining future work belongs to the broader parent Pi instrument vision rather than this foundation document:

- multi-LFO selection and named modulation target presets
- richer semantic slot bindings beyond direct `module-prop`
- higher-level instrument document ownership above a single track foundation
