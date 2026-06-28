# AudioRecorder Module — Design

Date: 2026-06-28

## Goal

A module that records its audio input to a downloadable file with a **sample-accurate
start**, aligned to the same clock everything else in the engine uses
(`oscillator.start(T)`, transport quantization). No start jitter.

## Why not `MediaRecorder`

`MediaRecorder` and the rest of the engine live on **two different clocks**:

- `oscillator.start(t)` / transport scheduling → **AudioContext sample clock**, deterministic.
- `MediaRecorder.start()` → **main-thread / media-pipeline wall clock**. It begins
  "whenever the call is processed," subject to event-loop jitter, and has no
  `start(when)` overload.

That gap (a few ms to tens of ms) is architectural, not a tuning problem — confirmed by
prior experience trying to align `MediaRecorder` to a Web Audio metronome. So
`MediaRecorder` is rejected for the precise-start requirement.

## Approach: AudioWorklet capture on the sample clock

A recorder `AudioWorkletProcessor` runs **in the audio thread on the sample clock**.
`process()` sees 128-sample blocks and the global `currentFrame` / `sampleRate`. The
module computes a target start *frame* and the processor begins capturing at exactly that
sample — same scheduling model as `oscillator.start(T)`, sample-accurate by construction,
immune to event-loop jitter regardless of recording length.

### Key simplification

We do **not** need a transport `Source` or the scheduler. The worklet does the
sample-accurate waiting itself on the audio thread. The module only needs the target
`contextTime`, which it gets directly from
`transport.getContextTimeAtTicks(targetTick)`. This is simpler *and* more precise than a
scheduled callback (which is only accurate to the scheduler lookahead).

## Timing / quantization

The module computes a target start `contextTime`, converts to a frame
(`round(t * sampleRate)`), and posts it to the worklet.

- **free** → start at `context.currentTime` (now).
- **bar** / **beat** → reuse the next-boundary math from
  `StepSequencerSource.onStart` (`ticksPerBar = TPB * timeSignature[0]`, round current
  ticks up to the next boundary), then `getContextTimeAtTicks`.
- **Transport-synced arm**: if `record()` is pressed while the transport is *stopped*,
  the recording is armed and started from the precise `contextTime` passed to the
  module's `start(contextTime)` when the transport plays (bar 1, sample-accurate).

The processor trims **within** the boundary block (sample offset = `targetFrame -
blockStartFrame`), so start is sample-accurate, not just block-accurate (~2.7 ms).

## Data flow (v1: in-memory)

```
input ─▶ recorder-processor (audio thread)
            │  passthrough ─▶ output   (so it can sit inline / be monitored)
            │  capture Float32 blocks from targetFrame
            ▼
   port.postMessage({type:"chunk", channels:[Float32Array]})   (batched ~0.18s)
            ▼
   module accumulates chunks in memory (JS arrays)
            ▼
   on stop: concat ─▶ encodeWav(channels, sampleRate) ─▶ Blob
```

- Passthrough output means the recorder is an inline insert, not a dead-end sink.
- Batched flush (every ~8192 frames) avoids ~375 msgs/sec and GC pressure, and keeps the
  worklet's own memory low (it flushes and clears).
- WAV encode = Float32 → 16-bit PCM, the trivial container. `encodeWav` is a standalone
  pure function (unit-tested, reused by every future variant).

## Limits (v1)

Raw PCM is the only real constraint:

| Format | per minute | per hour |
|---|---|---|
| Stereo 48k | ~23 MB | ~1.38 GB |
| Mono 48k | ~11 MB | ~691 MB |

In-memory accumulation is bounded by tab RAM — comfortably fine for minutes-long live
capture (a 30-min stereo set ≈ ~690 MB). WAV also has a hard ~4 GB / ~3 hr single-file
limit (32-bit RIFF size field). Not a concern for the jam use case.

`// ponytail: in-memory accumulation; add streaming-to-disk if recordings exceed ~tens of minutes`

## Module shape

- `AudioRecorder extends Module<ModuleType.AudioRecorder>`, `audioNode: AudioWorkletNode`.
- IO: audio `in` + passthrough audio `out` (both reference the worklet node).
- props: `{ quantize: "free" | "beat" | "bar" }`.
- state: `{ isRecording: boolean; durationSeconds: number }`.
- methods: `record()`, `stopRecording()`; delivers the finished `Blob` via an
  `onRecordingComplete` callback.
- lifecycle overrides: `start(contextTime)` (fires an armed recording), `stop(contextTime)`
  (stops recording when transport stops).

Pure, testable helpers (no worklet needed in tests):
- `nextQuantizedTick(currentTicks, quantize, ticksPerBar)`
- `encodeWav(channels, sampleRate)`

## Future implementation

### v2 — SharedArrayBuffer transport (committed)

The capture core (precise start, trim, passthrough) and `encodeWav` are **identical** in
v2. Only the sample-out plumbing swaps — kept behind two seams in v1 (**emit** and
**sink**):

| | v1 (in-memory) | v2 (SharedArrayBuffer) |
|---|---|---|
| worklet emits via | `port.postMessage(chunk)` | writes to a SAB ring buffer (Atomics) |
| main thread receives via | `port.onmessage` → push array | drain loop reads the ring (optionally in a Worker) |
| sink | array in memory | array **or** stream-to-disk |

Roughly 70% reused, 30% rewritten plumbing.

**⚠️ SharedArrayBuffer requires cross-origin isolation** — the host app must serve
COOP/COEP headers (`crossOriginIsolated === true`) or SAB is unavailable. This is the main
reason v1 (postMessage) exists: it works today with no header changes.

**SAB ≠ no-memory.** SAB is *how samples cross the thread boundary*; streaming-to-disk is
*the sink*. They are independent choices (SAB→memory or SAB→disk).

### Other future work

- **Streaming-to-disk sink** (File System Access API / progressive WAV) for unbounded
  length — swaps only the v1 *sink* seam.
- **Quantized stop** (v1 stop is immediate). Same boundary math as start.
- **Grid UI**: record/stop/arm controls + duration readout + download link. Needs the
  AudioModule component to reach engine module methods (record/stop) and receive the blob,
  which the current prop-only component pattern doesn't cover — small plumbing addition.
- **OfflineAudioContext bounce** — separate, non-realtime "export the patch" path; not
  this module.
