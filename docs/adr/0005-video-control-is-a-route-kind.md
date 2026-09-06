# 5. Control is a route kind in the video engine, and control modules run in the worker

Date: 2026-09-06. Status: accepted. Supersedes the binding shape in ADR 4.
Context: `docs/plans/2026-09-06-video-control-modules-design.md`.

## Context

ADR 4 made a video prop follow audio through a binding: a string naming a
host-pushed source (`patch:<id>:<prop>`, `spectrum:<id>:<band>`) mapped onto
one prop. Spectrum bands, LFOs and later a MIDI mapper need composition and
new source kinds, and bindings were a second edge vocabulary beside texture
routes, with a bare string where a route has a plug.

## Decision

- One route list with a `kind`, texture or control. A control route joins a
  control output plug to a numeric prop and carries the range mapping the
  binding had. Several control routes into one prop add their swings.
- Every source is a module. Control modules are video modules with no
  texture IO and a `tick` the worker runs once per frame, writing outputs
  into a worker-internal values map. Audio Prop mirrors one audio prop; Band
  and LFO follow.
- Modulation never writes props. Props are the saved knobs; control routes
  are applied when passes are built.
- The main thread pushes raw inputs only, as ADR 2 chose. No evaluation
  moves there.

## Alternatives rejected

- Keeping bindings beside routes: two vocabularies for one canvas, and the
  picker, the slice and the engine each carry both.
- Copying the audio engine's IO classes: they manage live Web Audio
  connections; a video route is data resolved per frame.
- Fields on the route for smoothing or operators: each is a module in
  disguise.

## Consequences

Bindings saved between 2026-09-05 and this change do not load; routes saved
without a kind load as texture. Drawing control routes as cables is a handle
question only.
