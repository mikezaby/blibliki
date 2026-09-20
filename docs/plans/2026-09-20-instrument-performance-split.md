# Instrument Performance Split

Status: increment 1 of 3 done on 2026-09-20.

## Why

`apps/instruments` is where the performance console grows from here, and
nearly all of it lived in one file,
`packages/instrument/src/react/InstrumentPerformance.tsx`, at 1516 lines. It
held nine unrelated things: faceplate scaling, the Fullscreen API shim, cell
value parsing, encoder arc geometry, the band with its drag handling, the peak
meter, the sidebar stats, the engine and controller session lifecycle, and the
layout. Every feature planned next (audio start, MIDI permission, a state for
visitors without a controller) lands in that session lifecycle, so it gets a
file of its own before anything is built on it.

## Rules for the split

Move only. No behaviour change, no visual change, and the public surface of
`@blibliki/instrument/react` stays as it is, so grid, instruments and mobile
are untouched. Each increment is one commit that passes on its own.

Component tests stay in `InstrumentPerformance.test.tsx` because they drive
the console through its public props, which is the level worth testing. Only
tests of pure functions follow their function to a new file.

Every app points Tailwind's `@source` at the `src/react` folder, not at the
file, so classes in new files are picked up without touching the apps.

## Target layout

| File                        | Holds                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `faceplateFit.ts`           | design width, handheld check, fit and style maths, `useFitToScreen`                |
| `fullscreen.ts`             | the prefixed Fullscreen API lookup and `useFullscreen`                             |
| `bandCell.ts`               | `BandCell`, `parseCellVisualValue`, cell label, key and CC lookups                 |
| `EncoderGlyph.tsx`          | arc geometry, `createEncoderArcPath`, the glyph                                    |
| `PerformanceBand.tsx`       | the band and its pointer and keyboard encoder handlers                             |
| `PerformanceMeter.tsx`      | the meter, its canvas drawing and dB maths                                         |
| `ConsoleStat.tsx`           | `ConsoleStat`, `StepButton`, `StatusLamp`                                          |
| `useInstrumentSession.ts`   | engine load, controller session, persistence, WAV download, control change sending |
| `InstrumentPerformance.tsx` | props, the Launch Control CC numbers, layout                                       |

## Increments

1. Done. Leaf modules with no dependency on the console: `faceplateFit.ts`,
   `fullscreen.ts`, `bandCell.ts`, `EncoderGlyph.tsx`. The console drops from
   1516 to 985 lines. `useFullscreen` is the one new function: it wraps the
   change listener and the toggle that were inline in the component.
2. Presentational components: `PerformanceBand.tsx`, `PerformanceMeter.tsx`,
   `ConsoleStat.tsx`.
3. `useInstrumentSession.ts`. The only increment that reshapes code rather
   than moving it, because the effect and the `sendControlChange` closure have
   to become one hook with a return value.

## Left out on purpose

- Moving `parseCellVisualValue` into the headless `src/display/` folder. The Pi
  display is fed already normalized values over `@blibliki/display-protocol`,
  so nothing else would use it today.
- A shared `clamp`. The repo keeps a private three line `clamp` per file
  (`macroMapping.ts`, `WavetableWav.ts`), and this split follows that.
- Dropping `createEncoderArcPath` from the public exports. Nothing outside the
  package imports it, but removing an export is not a move.
