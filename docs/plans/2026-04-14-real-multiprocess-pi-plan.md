# Real Multiprocess Pi Runtime Plan

## Goal

Make `blibliki-pi` behave like the normal single-process runtime while moving
per-track synthesis work into child processes.

This means preserving:

- the normal device/document startup path
- the normal controller session flow
- the normal display output path
- the normal global/master chain
- the authored instrument document as the source of truth

while changing:

- track DSP ownership from one process to multiple worker processes

## Current Constraints

### What already exists

- `packages/pi/src/instrumentSession.ts` owns the normal document -> patch ->
  engine -> controller/display lifecycle.
- `packages/instrument/src/compiler/createInstrumentEnginePatch.ts` builds the
  full single-process runtime graph, including track modules and the global
  chain.
- `packages/instrument/src/compiler/createTrackEnginePatch.ts` can build one
  isolated track patch, which is the right compiler seam for child workers.
- `packages/engine/src/Engine.ts` exposes live module instances, so runtime-side
  graph augmentation is possible after load.

### Missing primitive

There is no cross-process audio bridge today.

`node-web-audio-api` supports online `AudioContext` output sinks, but
`createMediaStreamDestination()` is explicitly not implemented. That means we do
not have an off-the-shelf way to pipe one process's live Web Audio graph into
another process's graph.

Because of that, the real version requires a custom PCM exporter/importer
bridge.

## Target Architecture

### Parent process responsibilities

- device startup / Firestore deployment resolution
- instrument document ownership
- controller session
- display rendering / OSC display output
- persistence flow
- transport ownership
- global/master audio chain
- child worker lifecycle

### Track worker responsibilities

- load one authored track patch
- receive transport/note/controller updates from parent
- render only that track's audio
- export PCM frames back to parent
- report enough state/events for health and debugging

### Audio routing model

1. Parent starts one worker per enabled track.
2. Each worker loads `createTrackEnginePatch(track, { master: false, ... })`.
3. Worker attaches a runtime audio exporter node to the final track output.
4. Exporter sends PCM frames over IPC to parent.
5. Parent creates one audio importer node per track.
6. Parent mixes importer outputs into the existing global chain.
7. Parent owns the only real speaker output.

## Phased Implementation

### Phase 1: Audio bridge

- Add a worker-side AudioWorklet processor that taps audio input and posts
  PCM chunks to the main thread.
- Add a parent-side AudioWorklet processor that consumes queued PCM chunks and
  outputs them as audio.
- Add runtime helpers in `packages/pi` to load and wire these processors.

Success criteria:

- one worker can render a track and the parent can hear it through a local
  importer node

### Phase 2: Parent global mixer

- Build a parent-owned global chain using the existing instrument runtime
  semantics
- connect all track importer nodes into that chain
- keep a single audible output in the parent

Success criteria:

- audible multi-track output with parent-owned master/global effects

### Phase 3: Normal Pi session flow

- replace benchmark startup with a real multiprocess session path
- keep display/controller/persistence in the parent
- forward real note/controller events to workers

Success criteria:

- same startup/document/controller/display flow as normal `blibliki-pi`

### Phase 4: Live state parity

- propagate worker-side runtime updates needed for display correctness
- keep controller feedback and display values aligned with worker audio state

Success criteria:

- display/controller behavior matches the normal session closely enough for
  practical use

## Main Technical Risks

### IPC bandwidth and latency

Raw Float32 PCM at 48kHz stereo is expensive. We may need:

- fixed render quanta
- transferables / Buffers
- optional Int16 packing
- bounded buffering in the parent importer

### Clock drift

Worker contexts and the parent context are not sample-locked. The importer will
need a small queue and dropout/underrun handling.

### Controller/display parity

The normal controller session currently assumes one live engine in the parent.
To preserve exact behavior, we will likely need a parent proxy layer for worker
module updates rather than trying to reuse the current session unchanged.

## Immediate Next Step

Implement the Phase 1 PCM bridge in `packages/pi` and prove:

- worker track output can be exported
- parent importer can play it audibly
- the existing single-process benchmark path is no longer the target
