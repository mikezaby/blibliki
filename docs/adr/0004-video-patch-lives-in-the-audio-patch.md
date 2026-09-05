# 4. The video patch lives on the audio patch canvas and in the audio patch document

Date: 2026-09-05. Status: accepted. Context:
`docs/plans/2026-09-05-video-patch-editor-design.md`.

## Context

The video engine (ADR 1 to 3) needs an editor. The user wants the patchbay
feel: video modules patched like audio modules, and a way to keep an eye on
the output while working on sound.

## Decision

Video modules are nodes on the same ReactFlow canvas as audio modules, with
a third handle tone for texture connections. The video patch (modules,
routes, bindings) is saved as a `video` field of the audio patch document,
and video node positions are saved in the same gridNodes list. A Visuals
node (the video Output module) shows a live preview and opens the projector.
Audio reaches video props through bindings chosen in a picker on each numeric
prop: spectrum bands from Spectrum modules in the patch, or audio module
props.

## Alternatives rejected

- Bindings as cables with control handles. The right direction later; too
  much for an MVP and it forces a control IO the video engine bootstrap left
  out. Bindings are data that can be drawn as edges later.
- Two layers over one canvas with a toggle. Hides the audio side while
  binding.
- Video routing nested inside the Visuals module. A second canvas and hidden
  state.
- Saving the video patch in the instrument document or its own collection.
  Instruments run from their own document, not a grid patch; live video
  control from performance mode is future work and will need its own answer.

## Consequences

The Visuals button leaves instrument performance mode. The video engine
renders into an internal canvas and copies frames to attached views (preview,
projector) so the preview outlives the popup. The "first Spectrum module in
the patch" shortcut goes away in favour of per-module spectrum controls.
