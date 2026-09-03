# Video engine: design

Status: design agreed, not started. GitHub issue #62.

## Goal

A video counterpart to `@blibliki/engine`: modules with typed inputs and
outputs, routed one into another, applying transformations to an image and
ending at an output. One or many sources, chained, directed to a screen. The
visuals react to the audio patch (knob positions) and to the audio itself
(spectrum, level).

Two hard constraints from the ticket discussion:

1. Nothing video-related runs on the thread that runs the audio engine. The
   audio tab's main thread carries MIDI handling, the transport scheduler's
   lookahead, routing and the grid UI. A 60 fps render loop there would jank
   all of it.
2. The visuals go on a second screen (a projector) while the performer's own
   screen shows the instrument performance mode.

## Decisions

### The video engine runs in a Web Worker

The engine, its module graph and the renderer all live in a dedicated worker.
The worker has its own thread and its own heap, so neither rendering nor GC
of the video engine touches the audio tab's main thread.

Rejected: a separate tab. It gives process isolation, but it needs a
cross-tab bridge (`BroadcastChannel`), and the audio can only reach it
through an OS loopback device (see below). The worker gives the same thread
isolation with plain `postMessage`.

### The projector is a dumb window with one canvas

The audio tab opens a second window with `window.open` from a button in
performance mode (a user gesture is required). The window holds a single
canvas that hands itself to the worker through `transferControlToOffscreen`.
After that the window's main thread does nothing: the browser composites the
worker's frames natively.

A same-origin window opened this way shares a renderer process, and so a
main thread, with its opener. That is acceptable only because nothing runs on
it. The projector window must stay dumb: no React, no editor. The editor for
video patches lives in the audio tab's UI.

Placement: Chrome's Window Management API opens the window on a chosen screen
and requests fullscreen there. Firefox and Safari lack it, so the fallback is
dragging the window across and pressing the fullscreen shortcut once.

### Audio reaches the worker as analyser data, not as an audio stream

The audio tab reads an `AnalyserNode`'s frequency bins once per frame (a
native call, no JS DSP) and transfers the buffer to the worker. Two buffers
ping-pong: the worker sends each back after reading.

Rejected: an OS loopback device such as BlackHole feeding `getUserMedia` in a
second tab. It works, but it is macOS only, needs a system install and a
permission prompt per session, adds latency, requires disabling echo
cancellation, noise suppression and auto gain or the spectrum is mangled, and
does nothing for the Capacitor mobile target. A loopback input can still be
added later as a video-engine source module for reacting to audio that is not
blibliki's (a DAW, for example).

### The audio patch is mirrored, not re-run

The engine already exposes `serialize()`, `onPropsUpdate` and
`onStateUpdate`. `@blibliki/display-protocol` already uses this shape to feed
the Pi display. The host sends a snapshot on connect and forwards each update.
The worker keeps a read-only mirror; it does not run a fake audio engine.

Known gap: prop updates fire for knob and UI changes only. Audio-rate
modulation (an LFO sweeping a cutoff) never touches props, so the mirror sees
the knob position. Reacting to a modulated signal needs a "video send" module
on the audio side that samples a signal and streams it. Out of scope here.

### Raw WebGL2, no framework

The bootstrap needs a shader compiler, a fullscreen quad, framebuffers,
textures and a blit: a couple of hundred lines, no dependency, and it works
in workers wherever `OffscreenCanvas` does. WebGPU in workers is not there on
Safari.

Rejected: p5.js. It targets the main thread and the DOM, its immediate-mode
drawing does not map to a graph of texture passes, and it is unsupported in a
worker. Rejected for now: three.js. It works in workers and its render
targets and postprocessing chain map well onto the graph, but it pays for 3D
the ticket does not ask for. The visuals are 2D for now. The renderer sits
behind a pure pass list (see Testing), so a later move to three.js is one
contained file.

## The package

`packages/video-engine`, published as `@blibliki/video-engine`. Same
vocabulary as the audio engine: modules with typed IO, routes, a prop schema
per module, `serialize`/`deserialize` in the same JSON shape as an audio
patch so the grid can draw and edit it later without a new node model.

The audio engine's `Module` base imports `Engine`, `Context` and MIDI, so
the video engine cannot extend it. It mirrors the shape. The prop schema
helpers are copied, not imported, so the worker bundle does not pull in Web
Audio. If they prove identical, lifting them into `@blibliki/utils` is a
later change (recorded in `docs/findings.md`).

### IO kinds

- **Texture IO** carries an image. A frame is a chain of fragment shader
  passes ping-ponging between framebuffers.
- **Control IO** carries one number per frame, the equivalent of CV.

### Bootstrap modules

The minimum that proves the architecture:

- Source: solid colour or gradient
- Transform: one shader effect (hue rotate)
- Merge: blend two textures by a mix amount
- Overlay: composite one texture over another with alpha
- Output: blits to the canvas

Camera and video-file sources come later; they need main-thread capture and
frame transfer.

### Control bus

The host feeds the worker named control signals: one per mirrored audio
patch prop (named by module id and prop), spectrum bands, and an RMS level.
Any numeric prop on any video module can be bound to a control name with an
input range and an output range. One bus, not a module type per binding.

## Protocol

One discriminated message union exported from the package; the grid and any
future host share the types.

Host to worker: `init` (transferred canvas), `snapshot` (full video patch),
graph commands (`addModule`, `updateProps`, `addRoute` and their removes),
`controls` (mirrored audio props), `spectrum` (transferred `Float32Array`).

Worker to host: `ready`, `patch` (state echoed after each command), `error`.

The host side is `VideoEngineHost`, a thin class in the same package. It owns
the worker, opens the projector window, subscribes to the audio engine's
props and state callbacks, runs the analyser read on `requestAnimationFrame`
and forwards everything. The grid uses this class and nothing lower.

## Failure modes handled now

- Spectrum buffers are transferred, so two buffers ping-pong between host
  and worker.
- A bound control with no value yet keeps the prop's last value; it never
  snaps to zero.
- A lost WebGL context recompiles shaders and continues.
- A closed projector window pauses rendering; the graph stays alive until a
  new canvas arrives, so the patch survives reopening.
- Anything else the worker reports as `error` and the host surfaces it.

## Testing

Graph evaluation is pure: modules and routes in, an ordered list of render
passes out. Control binding is a pure map from control values to props.
Vitest covers both in node with no GPU, plus serialization round trips and
the protocol handler. The WebGL renderer is verified in the browser, not
through a fake renderer.

## Out of scope for the bootstrap

- Camera and video-file sources
- The grid UI for editing video patches
- The audio-side "video send" module for modulated signals
- A loopback audio input source module
