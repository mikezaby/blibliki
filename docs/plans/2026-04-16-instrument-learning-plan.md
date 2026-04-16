# Instrument Learning Plan

**Goal:** Reclaim ownership of `@blibliki/instrument` by learning the package as a system: authored document model, track/block model, compilation, runtime/controller behavior, and real consumers.

**Recommended Pace:** `2-3 focused hours/day` for `7 days`

**Estimated Time:**
- Practical ownership: `14-21 hours`
- Deep ownership across `instrument + grid + pi + hardware assumptions`: `25-40 hours`

## Package Mental Model

The main flow through the package is:

`InstrumentDocument` -> `Track`/blocks/pages -> compiled track/instrument -> engine patch -> runtime navigation/display/controller session -> `grid` and `pi` consumers

The key distinction to keep in mind throughout this plan:

- Authored state: what the document describes
- Compiled state: what the compiler derives from the document
- Runtime state: what is active while the instrument is running

## Day 1: Build The Mental Model

**Read:**
- [packages/instrument/src/index.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/index.ts)
- [packages/instrument/src/document/types.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/document/types.ts)
- [packages/instrument/src/document/defaultDocument.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/document/defaultDocument.ts)
- [docs/plans/2026-03-19-instrument-foundation-design.md](/Users/mikezaby/projects/blibliki/blibliki/docs/plans/2026-03-19-instrument-foundation-design.md)

**Goal:**
- Understand what an instrument document contains
- Understand what a track, page, slot, and hardware profile are
- Understand the ownership boundary between authored model and hardware projection

**Questions to answer:**
- What is the smallest valid instrument in this package?
- Which fields are core authored data versus defaults/conventions?
- What belongs to `Page` versus `Track` versus hardware mapping?

**Output:**
- Write a one-page note listing the package nouns and ownership boundaries

## Day 2: Understand Blocks And Track Construction

**Read:**
- [packages/instrument/src/blocks/BaseBlock.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/blocks/BaseBlock.ts)
- [packages/instrument/src/tracks/BaseTrack.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/tracks/BaseTrack.ts)
- [packages/instrument/src/tracks/Track.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/tracks/Track.ts)
- [packages/instrument/src/tracks/createTrackFromDocument.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/tracks/createTrackFromDocument.ts)
- [packages/instrument/src/pages/Page.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/pages/Page.ts)

**Goal:**
- Trace one track from source to output
- Understand how blocks expose modules, routes, IO, and slots
- Understand how track pages reference slots without owning signal flow

**Questions to answer:**
- Why do pages not imply routing?
- How are controller-visible slots connected back to module props?
- What changes when `sourceProfileId` or `fxChain` changes?

**Checkpoint:**
- Explain the default signal chain: `source -> amp -> filter -> fx1 -> fx2 -> fx3 -> fx4 -> trackGain`

## Day 3: Learn Compilation

**Read:**
- [packages/instrument/src/compiler/compileTrack.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/compiler/compileTrack.ts)
- [packages/instrument/src/compiler/scoping.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/compiler/scoping.ts)
- [packages/instrument/src/compiler/compileInstrument.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/compiler/compileInstrument.ts)
- [packages/instrument/src/hardware/launchControlXL3/pageMap.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/hardware/launchControlXL3/pageMap.ts)

**Goal:**
- Understand how authored tracks become compiled tracks
- Understand how slots become controller CC mappings
- Understand how LaunchControl XL3 pages are derived

**Questions to answer:**
- What is the difference between a compiled page and a resolved LaunchControl page?
- How are controller CC numbers assigned?
- Why is scoping needed?

**Checkpoint:**
- Explain how one slot in a page becomes a MIDI mapping in the midi mapper

## Day 4: Learn Runtime Patch Creation

**Read:**
- [packages/instrument/src/compiler/createTrackEnginePatch.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/compiler/createTrackEnginePatch.ts)
- [packages/instrument/src/compiler/createInstrumentEnginePatch.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/compiler/createInstrumentEnginePatch.ts)
- [packages/instrument/src/compiler/createInstrumentMidiMapperProps.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/compiler/createInstrumentMidiMapperProps.ts)

**Goal:**
- Understand which runtime modules are injected
- Understand how the authored instrument becomes a runnable engine patch
- Understand note input, controller input/output, midi mapper, master chain, transport, and step sequencers

**Questions to answer:**
- Which modules come from the authored track structure?
- Which modules exist only for runtime orchestration?
- How does the package wire track outputs into the global master chain?

**Checkpoint:**
- Explain the difference between `compileInstrument()` and `createInstrumentEnginePatch()`

## Day 5: Learn Runtime, Display, And Controller Behavior

**Read:**
- [packages/instrument/src/runtime/instrumentRuntime.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/runtime/instrumentRuntime.ts)
- [packages/instrument/src/runtime/displayState.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/runtime/displayState.ts)
- [packages/instrument/src/runtime/liveDisplayState.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/runtime/liveDisplayState.ts)
- [packages/instrument/src/runtime/controllerRuntime.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/runtime/controllerRuntime.ts)
- [packages/instrument/src/runtime/sequencerEdit.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/runtime/sequencerEdit.ts)
- [packages/instrument/src/runtime/instrumentControllerSession.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/runtime/instrumentControllerSession.ts)

**Goal:**
- Understand navigation state and visible page resolution
- Understand how display state is built from runtime state and live engine props
- Understand how LaunchControl CC input is reduced into navigation and persistence actions

**Questions to answer:**
- What changes when runtime mode switches to `seqEdit`?
- What is static display state versus live display state?
- How are save/discard actions represented?

**Checkpoint:**
- Explain exactly what happens for:
- `SHIFT`
- `TRACK_NEXT`
- `TRACK_PREV`
- `PAGE_UP`
- `PAGE_DOWN`
- sequencer step button presses

## Day 6: Study The Real Consumers

**Read:**
- [apps/grid/src/components/Instruments/InstrumentEditor.tsx](/Users/mikezaby/projects/blibliki/blibliki/apps/grid/src/components/Instruments/InstrumentEditor.tsx)
- [apps/grid/src/components/Instruments/InstrumentPerformance.tsx](/Users/mikezaby/projects/blibliki/blibliki/apps/grid/src/components/Instruments/InstrumentPerformance.tsx)
- [packages/pi/src/instrumentSession.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/pi/src/instrumentSession.ts)
- [packages/display-protocol/src/instrumentDisplayState.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/display-protocol/src/instrumentDisplayState.ts)

**Goal:**
- Understand how `grid` edits and performs instruments
- Understand how `pi` starts and manages instrument sessions
- Understand what the rest of the monorepo expects from `@blibliki/instrument`

**Questions to answer:**
- Why is `instrument` the domain/runtime owner?
- Why is `grid` only a consumer?
- Why is `pi` only a consumer plus device/runtime shell?

**Checkpoint:**
- Explain the package boundary between `instrument`, `grid`, `pi`, and `display-protocol`

## Day 7: Take Ownership With One End-To-End Change

**Pick one small change:**
- Add one slot to a block
- Expose one more value in display state
- Adjust one page layout
- Add one runtime behavior flag

**Trace it through:**
- document
- track/block construction
- compilation
- runtime/display behavior
- tests

**Rule:**
- Do not start with a refactor
- Start with one small behavior change that forces you to understand the package end-to-end

**Success condition:**
- You can explain every file you touched and why the change belongs there

## Tests To Read Alongside The Code

Use the tests as the executable spec:

- [packages/instrument/test/document/defaultDocument.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/document/defaultDocument.test.ts)
- [packages/instrument/test/document/InstrumentDocument.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/document/InstrumentDocument.test.ts)
- [packages/instrument/test/tracks/Track.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/tracks/Track.test.ts)
- [packages/instrument/test/tracks/TrackIO.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/tracks/TrackIO.test.ts)
- [packages/instrument/test/compiler/compileTrack.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/compiler/compileTrack.test.ts)
- [packages/instrument/test/compiler/compileInstrument.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/compiler/compileInstrument.test.ts)
- [packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/compiler/createInstrumentEnginePatch.test.ts)
- [packages/instrument/test/runtime/instrumentRuntime.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/runtime/instrumentRuntime.test.ts)
- [packages/instrument/test/runtime/controllerRuntime.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/runtime/controllerRuntime.test.ts)
- [packages/instrument/test/runtime/liveDisplayState.test.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/test/runtime/liveDisplayState.test.ts)

## Suggested Daily Routine

- Read code for `45-60 min`
- Write notes in your own words for `15 min`
- Trace one concrete example manually for `20-30 min`
- Read matching tests for `20-30 min`
- End by writing `3` things that still feel unclear

## Ownership Checklist

You own the package when you can answer these without guessing:

- What is authored state vs compiled state vs live runtime state?
- Where does controller mapping come from?
- Where are engine modules injected that are not present in the document?
- How does `seqEdit` alter navigation and display?
- Which responsibilities belong in `instrument`, `grid`, `pi`, and `display-protocol`?

## Recommended First Guided Session

If you want to start immediately, begin with this exact order:

1. [packages/instrument/src/index.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/index.ts)
2. [packages/instrument/src/document/types.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/document/types.ts)
3. [packages/instrument/src/document/defaultDocument.ts](/Users/mikezaby/projects/blibliki/blibliki/packages/instrument/src/document/defaultDocument.ts)
4. [docs/plans/2026-03-19-instrument-foundation-design.md](/Users/mikezaby/projects/blibliki/blibliki/docs/plans/2026-03-19-instrument-foundation-design.md)

After that, stop and answer:

- What is the package trying to model?
- What does a default instrument actually contain?
- Which concepts are domain concepts and which are controller-specific?
