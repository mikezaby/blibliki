# Classic Drum Machine Module Design

**Date:** 2026-04-10
**Status:** Proposed

## Overview

This document defines a first engine module for classic drum machine sounds. The module is intentionally narrow: it is a sound source, not a sequencer. It should receive MIDI note events from existing modules such as `StepSequencer`, `MidiInput`, or `VirtualMidi`, and render a compact set of classic synthesized drum voices:

- kick
- snare
- tom
- cymbal
- cowbell
- clap
- open hi-hat
- closed hi-hat

The first version should feel native to the current engine:

- one module in `packages/engine`
- fixed MIDI note assignment
- flat serialized props compatible with `ModulePropSchema`
- `midi in` plus audio outputs
- a summed mix output and separate per-voice outputs

The goal is not full vintage-machine emulation. The goal is a musically useful, lightweight, modular drum source with recognizable classic electronic drum behavior and a small, consistent prop surface.

## Scope

### In Scope

- one `DrumMachine` engine module
- synthesized drum voices, not samples
- fixed note-to-voice mapping
- per-voice `level`, `decay`, and `tone` props
- velocity-sensitive triggering
- one summed output plus separate voice outputs
- classic hi-hat choke behavior
- serialization and UI compatibility through standard module props

### Out of Scope

- built-in pattern memory or step sequencing
- sample playback
- user-remappable MIDI notes in `v1`
- per-step parameter locks
- accent, flam, shuffle, or machine-specific behavior modeling
- multiple toms, multiple cymbals, or full General MIDI drum coverage

## Recommended Architecture

Three implementation approaches are reasonable:

1. Imperative Web Audio one-shots inside a single module
2. Internal graph built from existing engine modules
3. Single custom AudioWorklet that renders all voices

The recommended `v1` approach is `1`.

Why this is the best fit:

- drum hits are naturally one-shot events created on demand
- each voice can create short-lived node graphs without adding new engine-wide abstractions
- it avoids forcing drum synthesis into polyphonic note-hold patterns that fit melodic modules better than percussion
- it is much simpler than a custom processor while still allowing precise scheduling from `triggerAttack(note, time)`

The AudioWorklet approach is attractive later if CPU use becomes a problem or if tighter machine-style behavior is needed. The internal-engine-submodule approach looks conceptually elegant, but it is a poor fit for short transient graphs that need custom scheduling and cleanup per hit.

## Module Shape

The module should be introduced as `ModuleType.DrumMachine` and implemented as a regular `Module<ModuleType.DrumMachine>`, not a `PolyModule`.

### IO

Inputs:

- `midi in`

Outputs:

- `out`
- `kick out`
- `snare out`
- `tom out`
- `cymbal out`
- `cowbell out`
- `clap out`
- `open hat out`
- `closed hat out`

The module should not expose a standard audio input. It is a source module.

### Output Model

Each drum voice gets its own output bus. All voice buses also feed a master mix bus exposed as `out`.

That means:

- `out` is the default main output of the module
- `out` always carries the summed kit mix
- each dedicated output exposes only that voice bus
- connecting both `out` and a dedicated voice output will intentionally duplicate that voice in the downstream patch

In normal use, users should be able to patch only `out` and hear the full drum machine without wiring any separate outputs. The dedicated outputs exist for modular post-processing, not to replace the main output.

That duplication is acceptable in `v1`. The engine does not currently offer a clean normalized-output model that would automatically remove a voice from the summed bus when a dedicated output is patched.

## MIDI Note Map

The first version should use a fixed, GM-leaning note map. This keeps patches predictable and avoids spending `v1` complexity on note-routing props.

| Voice | MIDI | Note |
| --- | ---: | --- |
| Kick | 36 | C1 |
| Snare | 38 | D1 |
| Clap | 39 | D#1 |
| Closed Hi-Hat | 42 | F#1 |
| Tom | 45 | A1 |
| Open Hi-Hat | 46 | A#1 |
| Cymbal | 49 | C#2 |
| Cowbell | 56 | G#2 |

Behavior rules:

- `noteOn` triggers the assigned voice
- unmapped notes are ignored
- `noteOff` is ignored for all voices in `v1`
- `closed hi-hat noteOn` chokes currently ringing open hi-hat voices

The module should react to note number only. Channel filtering can stay outside the module through existing MIDI routing modules such as `MidiChannelFilter`.

## Prop Model

The current engine prop system is flat, so the drum machine should not attempt nested `voices.kick.decay` style props in `v1`.

The prop surface should use explicit flat keys:

- `masterLevel`
- `kickLevel`, `kickDecay`, `kickTone`
- `snareLevel`, `snareDecay`, `snareTone`
- `tomLevel`, `tomDecay`, `tomTone`
- `cymbalLevel`, `cymbalDecay`, `cymbalTone`
- `cowbellLevel`, `cowbellDecay`, `cowbellTone`
- `clapLevel`, `clapDecay`, `clapTone`
- `openHatLevel`, `openHatDecay`, `openHatTone`
- `closedHatLevel`, `closedHatDecay`, `closedHatTone`

### Prop Semantics

The names stay consistent across voices, but the internal meaning is voice-specific:

- `level`: final voice gain before it hits the voice bus
- `decay`: overall tail length for that voice
- `tone`: brightness, pitch contour, or filter center depending on the voice

This is the right compromise for `v1`: a uniform UI language for users, without pretending that every drum voice uses the exact same synthesis controls internally.

### V1 Simplicity Rule

`v1` should stay intentionally strict:

- one global `masterLevel`
- `level`, `decay`, and `tone` for every voice
- no per-voice `tune`, `snappy`, `noise`, `attack`, or machine-mode props yet

That keeps the first release easy to learn, easy to patch, and easy to test.

### Extensibility Direction

The implementation should still be shaped so that future versions can add voice-specific controls without redesigning the module category.

Likely future prop additions:

- `kickTune`
- `snareTune`
- `tomTune`
- `snareNoise`
- `hatMetal`
- `clapSpread`

The important boundary is:

- `v1` exports only the shared prop trio
- internal synthesis code should remain voice-local so future props can be added per voice without rewriting the whole module

### Suggested Ranges

The exact defaults can be tuned during implementation, but the schema should roughly follow:

- `masterLevel`: `0..1.5`
- `<voice>Level`: `0..1.5`
- `<voice>Decay`: `0.01..4`
- `<voice>Tone`: `0..1`

`Tone` should stay normalized to `0..1` even though it maps differently per voice. That gives the UI one stable control shape and keeps serialization simple.

## Voice Synthesis Strategy

Each MIDI trigger should create a short-lived voice graph, connect it to the target voice bus, schedule its envelopes, and clean it up after playback.

This module should internally own:

- one master output gain node
- one gain node per voice output bus
- one cached noise buffer for noise-based voices
- lightweight bookkeeping for active one-shot nodes that need cleanup
- an open-hi-hat choke group

The graph per trigger should be built directly with Web Audio nodes rather than child modules.

### Kick

Recipe:

- sine or slightly shaped oscillator for the body
- fast downward pitch sweep
- short amplitude envelope
- optional very short click transient

Prop mapping:

- `kickDecay`: body envelope length
- `kickTone`: balance between darker round kick and brighter clickier kick
- `kickLevel`: final output gain

### Snare

Recipe:

- short tonal body oscillator
- filtered noise burst
- shared envelope timing with slightly different body/noise decay ratios

Prop mapping:

- `snareDecay`: total body and noise tail
- `snareTone`: noise brightness and body/noise emphasis
- `snareLevel`: final output gain

### Tom

Recipe:

- pitched sine or triangle body
- gentler pitch sweep than kick
- optional tiny attack noise

Prop mapping:

- `tomDecay`: resonance tail
- `tomTone`: base brightness and pitch contour amount
- `tomLevel`: final output gain

### Clap

Recipe:

- filtered noise
- 3 to 4 quick envelope bursts followed by a short tail

Prop mapping:

- `clapDecay`: final tail length
- `clapTone`: bandpass or highpass brightness
- `clapLevel`: final output gain

### Cowbell

Recipe:

- two square oscillators at a fixed inharmonic ratio
- bandpass shaping
- short envelope

Prop mapping:

- `cowbellDecay`: ring-out time
- `cowbellTone`: oscillator/filter brightness
- `cowbellLevel`: final output gain

### Cymbal

Recipe:

- metallic oscillator bank or filtered noise-plus-metal partials
- brighter and longer than hats

Prop mapping:

- `cymbalDecay`: ring length
- `cymbalTone`: top-end emphasis
- `cymbalLevel`: final output gain

### Closed and Open Hi-Hat

Recipe:

- shared metallic/noise core
- separate envelope presets and output buses
- closed hat is short and tight
- open hat is longer and belongs to a choke group

Prop mapping:

- `<hat>Decay`: tail length
- `<hat>Tone`: brightness and filter emphasis
- `<hat>Level`: final output gain

Behavior rule:

- triggering `closedHat` should quickly ramp active `openHat` voices down and dispose them

## Trigger Flow

The module should rely on the existing `Module.onMidiEvent` pipeline and override `triggerAttack(note, triggeredAt)`.

Recommended flow:

1. Receive `noteOn`
2. Convert MIDI note number to drum voice
3. Read note velocity and scale voice gain
4. Apply any choke-group behavior
5. Spawn the one-shot graph for that voice
6. Connect graph into the matching voice bus
7. Let the voice bus feed both its dedicated output and the master mix bus
8. Schedule cleanup after the envelope completes

`triggerRelease` should be a no-op in `v1`.

## State and Lifecycle

This module does not need musical polyphony state in the melodic sense, but it does need runtime bookkeeping for disposable nodes.

Recommended internal runtime state:

- active open-hi-hat voices for choke handling
- active disposable nodes keyed by voice instance id
- cached noise buffer reused across snare, clap, hats, and cymbal triggers

`dispose()` must:

- stop or disconnect any active one-shot nodes
- disconnect all voice buses
- clear cached runtime bookkeeping

## Serialization and UI Implications

Because props are flat, this module should serialize cleanly through the existing engine system with no schema changes beyond a new `ModuleType` entry and prop schema.

This is also the most practical shape for the grid UI:

- each voice can render the same trio of controls
- labels can stay consistent: `Level`, `Decay`, `Tone`
- UI grouping can be visual only; it does not need nested prop structures

The separate outputs should appear in the module node so users can patch kick, snare, hats, or cymbal into their own effect chains.

## Testing Strategy

The first implementation should add tests in one dedicated module test file:

- `packages/engine/test/modules/DrumMachine.test.ts`

The test plan should cover:

- note mapping: each supported MIDI note triggers only the expected voice
- unmapped notes: produce no output
- velocity: lower velocity produces lower output energy
- separate outputs: each dedicated output carries only its assigned voice
- summed output: `out` contains all triggered voices
- prop updates: changing `level`, `decay`, or `tone` changes rendered behavior
- hi-hat choke: triggering closed hat silences an active open hat tail
- serialization: prop defaults and updates survive module serialize/restore flow

Audio-behavior assertions should use `Inspector` and short offline renders rather than snapshotting exact waveforms.

## Implementation Surface

When implementation starts, the likely file touch list is:

- create `packages/engine/src/modules/DrumMachine.ts`
- update `packages/engine/src/modules/index.ts`
- add `ModuleType.DrumMachine` mappings
- add `packages/engine/test/modules/DrumMachine.test.ts`
- add a grid UI component later when the engine shape is stable

The grid UI should be treated as follow-up work, not part of the engine design itself.

## Future Extensions

The first version should stay narrow. Likely follow-ups after `v1`:

- remappable note assignments
- accent input or accent prop
- separate low/mid/high tom voices
- choke groups beyond hats
- optional machine modes such as 808-like or 909-like voicing
- custom processors if transient accuracy or CPU use becomes a problem

## Recommendation Summary

Build `DrumMachine` as a MIDI-driven source module with:

- fixed note mapping
- eight synthesized classic drum voices
- flat per-voice `level`, `decay`, and `tone` props
- separate voice outputs plus a summed output
- one-shot Web Audio graphs created on demand
- closed-hat choking for open-hat voices

That gives the engine a useful drum source without duplicating sequencing concerns or introducing premature DSP infrastructure.
