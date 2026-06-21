# Track Audio Routing Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add instrument-editor controls for selecting an internal or track audio source and choosing parallel or serial routing.

**Architecture:** Extend the grid document mirror with the package audio-source shape. Keep immutable updates in `editorState.ts`; render source/routing selectors in `InstrumentEditor.tsx`. Processing tracks hide generator-specific controls while retaining note-source and sequencer controls for CC automation.

**Tech Stack:** React 19, TypeScript, `@blibliki/ui`, Testing Library, Vitest.

### Task 1: Grid document and state

**Files:**

- Modify: `apps/grid/src/instruments/document.ts`
- Modify: `apps/grid/src/instruments/editorState.ts`
- Modify: `apps/grid/test/instruments/editorState.test.ts`
- Modify: `apps/grid/test/instruments/createInstrument.test.ts`

Add the `InstrumentTrackAudioSource` union and explicit internal defaults. Add a helper that switches between internal and track sources while defaulting new track routing to `parallel`.

### Task 2: Editor controls

**Files:**

- Modify: `apps/grid/src/components/Instruments/InstrumentEditor.tsx`
- Modify: `apps/grid/test/instruments/InstrumentEditor.test.tsx`

Add:

- `Audio Source` selector: `Internal` plus every track.
- `Routing Mode` selector visible only for track sources.
- Preserve self-selection and disabled-track choices; the package intentionally permits experimental graphs.
- Hide MIDI channel, voices, and source profile controls for processing tracks.
- Keep note source and sequencer editor visible for CC automation.
- Save the selected `audioSource` value.

### Task 3: Verification

Run grid focused tests, grid typecheck/lint/build, then repository format/typecheck/lint/tests. Report the known unrelated DrumMachine timing failure if it recurs.
