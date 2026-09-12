# 11. A pass can keep its output for the next frame

Date: 2026-09-11. Status: accepted. Extends ADR 6.

## Context

ADR 6 pooled render targets on the rule that nothing survives a frame.
Feedback, the trails effect every audio-visual set leans on, needs last
frame's output of one pass while everything else stays pooled.

## Decision

A module can declare that the renderer keeps its output. After such a
pass draws, the renderer copies the framebuffer into a canvas-sized
texture named `<target>:prev`, one per instance, which the pass samples
next frame through an extra input no route provides. Modules declare
those extra inputs by uniform name, and the same path will carry media
frames the host uploads. Kept textures are dropped on resize, so trails
restart when the projector opens.

## Alternatives rejected

- Ping-pong targets for the feedback pass. Its consumers read the pooled
  target this frame, so a copy after drawing is one call and no second
  target.
- Keeping every target across frames. Memory per module and instance
  again, which the pool exists to avoid.

## Consequences

One copy of the canvas per kept pass per frame. Kept textures of removed
modules linger until the next resize.
