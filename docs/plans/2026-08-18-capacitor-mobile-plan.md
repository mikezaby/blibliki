# Capacitor mobile app — plan / session handoff

Status: **not started.** This document is the full context needed to begin; no
prior session knowledge is required.

## Goal

Ship the **instrument performance UI** as a mobile app (iOS + Android, store
distributable) running the real `@blibliki/engine`, with **MIDI controller
support** (hardware controllers are a hard requirement, not a nice-to-have).

## Why Capacitor

The engine is a Web Audio engine. Capacitor runs the existing web app inside a
native shell (WKWebView on iOS, Chromium WebView on Android), so:

- **The engine runs unmodified** — `AudioWorklet` ships in Safari 14.1 / iOS
  14.5+, and WKWebView uses the same WebKit engine. All six worklet processors,
  wavetable and recorder included, work as they do in the browser.
- **`@blibliki/ui` and the grid components work** — they are React/radix/Tailwind
  and need no rewrite.
- Native plugins cover what the web platform lacks (MIDI on iOS, background
  audio, store packaging).

A React Native port was attempted first and **parked** — `react-native-audio-api`
worklets can carry numbers but not bulk buffers, which makes Wavetable and
AudioRecorder impossible, and RN would also have required rewriting the entire
UI layer. Details: branch `react-native`, `apps/mobile/README.md`. Nothing from
that attempt is needed here.

**Accepted trade-off:** WebView audio latency is roughly 20–50 ms round trip vs
~10 ms native. Fine for sequenced playback and parameter control; noticeable for
tight live key-playing. Only a native rewrite fixes that, at disproportionate
cost.

## Repo facts

pnpm monorepo, Node 20/22, `pnpm` 11.

```
apps/       grid (main web app, Vite + React 19 + TanStack Router + Firebase/Clerk)
            pi-display, storybook
packages/   engine, transport, utils, ui, instrument, models, display-protocol, pi
```

Commands: `pnpm dev`, `pnpm build`, `pnpm build:packages`, `pnpm tsc`,
`pnpm lint`, `pnpm test`, `pnpm format`. Run all of tsc/lint/test/format before
finishing (see root `CLAUDE.md`).

Dependency flow: `utils → transport → engine → apps`. Rebuild packages after
changing them (`pnpm build:packages`).

## What already exists that this plan depends on

### 1. Headless performance UI state

`@blibliki/instrument` produces `InstrumentDisplayState` — a plain, serialisable
snapshot (bands, slots, encoder values, notices). `apps/grid/src/components/
Instruments/InstrumentPerformance.tsx` is just a renderer of that snapshot;
input goes back via `reduceInstrumentControllerEvent`.

Consequence: the mobile performance UI is a **renderer of the same state**, not a
re-implementation. Reuse or adapt `InstrumentPerformance.tsx` directly.

### 2. Platform seams in the engine (already on `main`)

- `setProcessorsLoader(fn)` — how the AudioWorklet processors get loaded.
  `index.browser.ts` wires the web loader; Capacitor uses this unchanged.
- `setMidiAdapterFactory(fn)` + `IMidiAdapter` — **this is where the iOS MIDI
  plugin plugs in.** Existing implementations: `WebMidiAdapter`,
  `NodeMidiAdapter`, `NoopMidiAdapter`.
  Interface (`packages/engine/src/core/midi/adapters/types.ts`):
  `requestMIDIAccess(): Promise<IMidiAccess | null>`, `isSupported()`, plus
  `IMidiInputPort` (addEventListener/removeEventListener) and `IMidiOutputPort`
  (send).

### 3. Patch format

`Engine.serialize()` / `Engine.load(data)` use
`{ bpm, timeSignature, modules, routes }`. Grid can export this ("Export for
engine") and import it back with automatic layout. Useful for testing parity
between desktop and mobile.

## MIDI plan

| Platform    | Approach                                                                          | Effort    |
| ----------- | --------------------------------------------------------------------------------- | --------- |
| **Android** | Web MIDI works in the Chromium WebView — the existing `WebMidiAdapter` runs as-is | none      |
| **iOS**     | WebKit has no Web MIDI; needs a native plugin bridging **CoreMIDI**               | see below |

iOS options:

1. `capacitor-musetrainer-midi` — covers iOS + Android (`listDevices`,
   `addListener`, `sendCommand`). Risk: last release ~a year ago.
2. **Write a small plugin over CoreMIDI** (~1–2 days Swift). Preferred if
   sysex is unsupported by the community plugin.

**Requirement to verify early: sysex.** The engine requests
`requestMIDIAccess({ sysex: true })` and the `LaunchControlXL3` controller
support uses sysex for LEDs/display. CoreMIDI handles sysex; confirm the chosen
plugin exposes it. If not → write the plugin.

Then implement `CapacitorMidiAdapter implements IMidiAdapter` and wire it with
`setMidiAdapterFactory` in the mobile entry point.

## Suggested steps

1. **Prove the engine in a WebView first.** Serve grid (or a minimal performance
   route) to a device/simulator and confirm audio works — especially
   AudioWorklet and the iOS audio-unlock-on-user-gesture requirement. Do this
   before any Capacitor scaffolding; it de-risks the core assumption cheaply.
2. Scaffold the Capacitor target (likely `apps/mobile`, Vite build output as the
   web dir; decide whether it reuses grid or is a slimmer performance-only app).
3. iOS audio session config (playback category, background audio if wanted) and
   Android equivalent.
4. MIDI: Android first (free), then the iOS plugin + `CapacitorMidiAdapter`.
5. Performance UI: render `InstrumentDisplayState`, touch input → controller
   events. Add an on-screen keyboard if useful.
6. Store packaging.

## Open questions

- Does the mobile app reuse **grid** wholesale, or is it a separate
  performance-only app sharing `packages/*`? (Affects Firebase/Clerk auth on
  mobile.)
- Is background audio required?
- Which controllers must work on mobile day one — LaunchControl XL3 only, or
  generic MIDI too?

## Non-obvious gotchas

- **iOS requires a user gesture** to start/resume an `AudioContext`. The
  performance UI needs an explicit start affordance.
- Verify **AudioWorklet inside WKWebView specifically** early (step 1) — it is
  the single assumption the whole approach rests on.
- Web Audio changes must follow the W3C spec exactly (see root `CLAUDE.md`,
  "Web Audio API Compliance") — this rule exists because approximating
  `AudioParam`/`MessagePort` semantics previously caused real bugs.
