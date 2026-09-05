# 1. The video engine runs in a Web Worker and renders to a dumb projector window

Date: 2026-09-03. Status: accepted. Context: GitHub #62,
`docs/plans/2026-09-03-video-engine-design.md`.

## Context

The audio tab's main thread carries MIDI handling, the transport
scheduler's lookahead, routing and the grid UI. A 60 fps render loop on
that thread would jank all of it. The visuals also have to appear on a
second screen (a projector) while the performer's own screen shows the
instrument performance mode.

## Decision

The video engine, its module graph and the WebGL renderer live in a
dedicated worker. The projector is a plain second window opened with
`window.open` from a user gesture, holding one canvas that hands itself to
the worker through `transferControlToOffscreen`. After that the window's
main thread does nothing: the browser composites the worker's frames.

A same-origin window opened this way shares a renderer process, and so a
main thread, with its opener. That is acceptable only because nothing runs
on it. The projector window must stay dumb: no React, no editor. The
editor for video patches lives in the audio tab's UI.

Placement is manual for now: drag the window to the projector, click it to
go fullscreen.

## Alternatives rejected

- A separate tab. Gives process isolation, but needs a cross-tab bridge
  (`BroadcastChannel`) and audio can only reach it through an OS loopback
  device (see ADR 2). The worker gives the same thread isolation with
  plain `postMessage`.
- Rendering on the main thread of the projector window. Would put the
  render loop back on the audio tab's main thread.
- Chrome's Window Management API for automatic placement on the projector
  screen. Chrome only; deferred until dragging the window becomes a chore.

## Consequences

The worker owns the render loop and pauses when the canvas is detached,
so a closed projector window does not lose the video patch. Everything the
worker needs arrives as messages: the video patch, graph commands, mirrored
audio controls, spectrum bins.
