# 3. The video renderer is raw WebGL2

Date: 2026-09-03. Status: accepted. Context: GitHub #62,
`docs/plans/2026-09-03-video-engine-design.md`.

## Context

The video engine is a graph of texture passes (source, transform, merge,
overlay, output) rendered in a worker on an `OffscreenCanvas`. The visuals
are 2D for now.

## Decision

Raw WebGL2, no framework. The bootstrap needs a shader compiler, a
fullscreen triangle, framebuffers, textures and a blit: a couple of hundred
lines, no dependency, and it works in workers wherever `OffscreenCanvas`
does. Graph evaluation is a pure function that turns modules and routes
into an ordered pass list; the renderer only executes that list.

## Alternatives rejected

- p5.js. Targets the main thread and the DOM, its immediate-mode drawing
  does not map to a graph of texture passes, and it is unsupported in a
  worker. It is a sketching tool, and this is an engine.
- three.js. Works in workers and its render targets and postprocessing
  chain map well onto the graph, but it pays for 3D the ticket does not
  ask for. Deferred until 3D scenes are wanted.
- WebGPU. Not available in workers on Safari.

## Consequences

Because the renderer sits behind the pure pass list, moving to three.js
later is one contained file, not a rewrite. Each module type is one
fragment shader; props become `u_<prop>` float uniforms and texture inputs
become `u_<input>` samplers.
