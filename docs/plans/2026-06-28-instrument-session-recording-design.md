# Instrument Session Recording — Design

Date: 2026-06-28

## Goal

Record an instrument's full audio output as a session, triggered generically and wired to
the Launch Control XL3 **Rec** button: pressing Rec starts the transport **and** recording
together; pressing Rec again — or Play — while recording stops both.

Builds on the [`AudioRecorder` module](./2026-06-28-audio-recorder-design.md) (sample-accurate
worklet capture).

## Behavior

| Action | State | Result |
|---|---|---|
| Rec | idle | start recording **+** start transport (recording aligned to transport start) |
| Rec | recording | stop **recording only** (transport untouched) |
| Play | playing | stop **transport only** — reverb/delay tails ring out and keep being recorded |
| Play | stopped | start transport |

Recording start is **coupled** to the transport (Rec from idle starts both, sample-aligned),
but recording **stop is independent**: stopping the transport does NOT stop recording, so
effect tails fade out and are captured until the user explicitly stops recording (Rec again).
This means recording can outlive the transport — the user controls when capture ends.

## Layers (respecting package boundaries)

The XL3 controller lives in `@blibliki/engine` and cannot import `@blibliki/instrument`, so
the trigger is generic and lives in the engine; the instrument only *designates* what to record.

### 1. Engine — generic trigger

- `sessionRecorderId?: string` — id of the `AudioRecorder` designated as session recorder.
- `get isSessionRecording(): boolean` — reads that recorder's `state.isRecording`.
- `toggleSessionRecording()`:
  - recording → `recorder.stopRecording()` (recording only; transport left running/stopped
    as-is, so effect tails keep being captured).
  - idle → `recorder.record()` (arms it), then `this.start()` if not already playing. On
    transport start the recorder's `start(contextTime)` override fires at the exact
    transport-start sample — recording is sample-aligned with the transport, no quantize
    needed on this path.
  - no-op if no/unknown `sessionRecorderId` (so non-instrument engines, e.g. grid, are safe).

`AudioRecorder` deliberately has **no** `stop(contextTime)` lifecycle override, so a transport
stop never ends recording.

### 2. Controller — generic, reusable

`BaseController` gains `toggleRecord()` → `engine.toggleSessionRecording()` and
`get isRecording()` → `engine.isSessionRecording`. Any controller can wire a record button
with no engine-specific code.

### 3. Instrument — the "generic" part

The instrument decides *what* to record: its final mix at `masterVolume.out`. Since
`AudioRecorder` is a passthrough, the tap is a **non-destructive fan-out** —
`masterVolume.out → sessionRecorder.in` — added alongside the existing
`masterVolume.out → master.in`, so the audible chain is unchanged.

- `instrumentRuntimeState.ts` — add `sessionRecorderId` to the runtime.
- `instrumentRuntimeModules.ts` — `createSessionRecorderModule(id, name)` (`AudioRecorder`).
- `createInstrumentRuntimeModules.ts` — push it.
- `instrumentRuntimeRoutes.ts` (`createMasterRoutes`) — add the tap route.
- `InstrumentSession.ts` — constructor sets `engine.sessionRecorderId =
  runtimePatch.runtime.sessionRecorderId`. The session shares the real `Engine` with the
  controller, so the controller's `toggleSessionRecording()` sees the designation.

### 4. XL3 — button + LED

- `RECORD_CC` press (value 127) → `this.toggleRecord()`.
- Record LED reflects `this.isRecording`, refreshed from `onStateChange` (transport state)
  and on press. Transport-coupling means stopping via Rec or Play clears it.
- `// ponytail:` LED color codes are best-guess red on/off; tune on the device.

## Output (v1)

The finished WAV is delivered via the `AudioRecorder`'s `onRecordingComplete(blob)` callback
plus `isRecording` / `durationSeconds` state. Wiring it to a download/save UI is a separate
follow-up; Pi/headless can ignore the blob. No DOM/storage assumptions baked into the engine
or instrument layers.

## Future work

- Download/save UI for instrument recordings (grid already has a per-module download for the
  standalone `AudioRecorder`).
- Persisting recordings (Firestore/IndexedDB/disk) — needs a storage decision.
- Decouple recording from the transport (record without playing) if a use case appears.
- SharedArrayBuffer capture + streaming-to-disk (see the AudioRecorder design's future section).
