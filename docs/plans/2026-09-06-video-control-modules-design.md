# Video control modules: design

Date: 2026-09-06. Scope: the video engine only. Context: ADR 2 (audio
reaches video as analyser data), ADR 4 (bindings are data, drawn as cables
later), `docs/plans/2026-09-05-video-patch-editor-design.md`.

## Problem

A video prop can follow one source through a binding: a spectrum band or an
audio module prop, mapped through a range and a curve. That does not scale
to what comes next:

- Sources are string prefixes (`patch:`, `spectrum:`), each hard-wired in the
  host, the worker and the picker. A new source kind touches three places.
- No composition. An LFO on top of a band, a smoothed band, a thresholded
  level: each would become another field on the binding until the binding is
  a module in disguise.
- The three spectrum bands are fixed thirds of the bin range, which is a
  linear split and musically wrong. The user wants the mean level of a chosen
  frequency band driving one or many props.
- Two edge vocabularies. Texture routes join two plugs (module id plus IO
  name), as the audio engine's routes do. Bindings join a bare string to a
  prop name. Once control is a real signal kind the two drift.

Out of scope here, but kept in mind: MIDI mapper control of video props, and
drawing control routes as cables.

## Where things run

The main thread pushes raw inputs and computes nothing. The worker owns the
control values, ticks control modules and evaluates control routes, all at
frame rate. This is already true today: the host forwards audio prop changes
and transfers analyser bins once per frame; `passes()` applies bindings in
the worker. Control modules extend that; they do not move anything to the
main thread.

Control rate is frame rate. The video engine has no use for audio-rate
control, so there is no worklet and no second clock.

## Data model

### One route vocabulary

Bindings go away. A binding becomes a route of kind control, and there is one
routes list:

```ts
type IOKind = "texture" | "control";
type IPlug = { moduleId: string; ioName: string };

type IRoute = {
  id: string;
  kind: IOKind;
  source: IPlug;
  destination: IPlug;
  // Control routes only: the range mapping the binding carried.
  inMin?: number;
  inMax?: number;
  outMin?: number;
  outMax?: number;
  exp?: number;
};
```

For a control route the destination `ioName` is the prop name. Texture
routes keep the rule that a new route into an occupied input replaces the old
one. Control routes accumulate, which is where the mixing rule lands.

A module declares its `inputs` and `outputs` as ports with a kind, the way
an audio module registers audio and MIDI IO. Texture modules have one
texture output, control modules one control output, Output has none. A
control input is named after the prop it drives, and a module lists only
the props it wants driven, so an enum or a module reference never gets a
handle. Route validation checks kind against kind, the same way the grid
refuses an audio-to-texture cable.

The audio engine's IO machinery (the Base class with plug and unPlug, live
connection lists, deterministic IO ids, the IO collection) is not copied. It
exists because a Web Audio connection is a live object with a lifecycle. In
the video engine a route is data resolved per frame in `buildPasses`. Same
vocabulary, not the same classes.

### Control modules are video modules

`VideoModule` gains one optional member:

```ts
// Control modules override this; texture modules keep the default (null).
tick(
  values: ReadonlyMap<string, number>,
  frame: { now: number; dt: number }, // seconds
): Record<string, number> | null;
```

A control module has `inputs = []` (no texture), a schema like any other
module, and returns its outputs. The engine keeps a worker-internal map of
control values keyed by `<moduleId>:<output>`; it is never part of the patch.
Texture modules return null and are never ticked. Control modules go in
`VideoModuleType` and `createModule` like any other module: no new class
hierarchy, no second registry.

A control route whose destination is a control module's prop is that module's
input, so composition needs no separate input concept.

### Every source is a module

The `patch:` and `spectrum:` pseudo-sources are the only reason bindings
needed a string: they had no module. Both get one. Band (below) replaces the
spectrum bands, and Audio Prop (below) replaces the prop mirror. The host
keeps pushing the same raw inputs (audio prop values on change, analyser bins
per frame) and the worker keeps them in internal maps that those two modules
read in `tick`.

### Patch document

`IVideoPatch` loses `bindings`; `routes` carries both kinds. Bindings saved
between the editor's merge (2026-09-05) and this change do not load: they
name sources that have no module. That is one day of patches, so there is no
migration; a `video` field with a `bindings` key loads with that key ignored.

### Frame order

Tick control modules in map insertion order, then `passes()`. A chain of two
control modules sees one frame of delay per hop. That is a `ponytail:`
comment; topological sort by control routes when it matters.

## Modules

### Audio Prop

Props: `moduleId` (an audio module), `prop` (one of its numeric props).
Output `out` is the prop's raw value. The worker has no audio schemas (the
package deliberately does not depend on the engine), so normalizing to 0 to 1
happens on the control route: connecting a cable fills the route's in range
and `exp` from the audio prop's schema, which is what the old binding did, so
a bound prop follows the knob's travel.

The worker keeps the last pushed value per `<audioModuleId>:<prop>` in an
internal map, exactly what the `controls` message delivers today. An Audio
Prop whose module or prop is gone outputs 0.

### Band

Props: `spectrumId` (the audio Spectrum module it reads), `lowHz`, `highHz`,
`gain`, `smoothing`. Output `out` in 0 to 1.

Per tick: take the raw bins kept for that Spectrum id, select the bins whose
center frequency falls in the range, average the dB, normalize with the
Spectrum's own min and max decibels, apply gain, clamp. The decibel range
arrives with the other audio prop values, so Band follows the audio module's
settings without a second copy. Bin to Hz needs the sample rate, which the
host adds to the spectrum message.

Smoothing is a one-pole filter on the output, on top of the analyser's own
smoothing, whose constant is tuned for display rather than for driving a
parameter. A Band whose Spectrum was deleted outputs 0.

### LFO

Props: `frequency`, `waveform` (sine, triangle, square, sawtooth, random),
`phase`. Output `out` in 0 to 1.

Phase advances by `dt * frequency` each tick, so a dropped frame slows the
LFO rather than making it jump. Unipolar only: a route's out range gives any
swing or polarity, so a bipolar output would duplicate the range mapping.

Transport sync is deferred. It needs bpm and a start time pushed from the
main thread, and the audio LFO's division table can be copied when that
lands.

### Not now

A Math or Smooth module. Band has smoothing built in and no concrete patch
needs an operator between two controls yet.

## Mixing rule

Several control routes into one prop: each contributes its swing, and the
prop takes the first route's `outMin` plus the sum of the swings, clamped to
the schema range:

```
value = outMin_1 + sum(t_i * (outMax_i - outMin_i))
```

With one route this is the binding formula as it was. With two it is
additive, which is what an LFO on top of a band should do. Multiply and
average are a later mode on the route if someone needs them.

Route ids are uuids, so the engine holds several control routes per prop from
the start and adds them. Two cables into one control input is the UI for it.

## Main thread and grid

- Host: the spectrum message carries the audio context's sample rate.
  Nothing else on the host changes; the `controls` message keeps its shape
  and now feeds the worker's audio prop map instead of the patch vocabulary.
- Registry: `inputsFor` already instantiates each module type once to learn
  its ports. `outputsFor` is built the same way, and the grid draws a handle
  per port in a tone per kind, so a new module's IO appears on the canvas
  with no grid change. The palette's Video section lists Audio Prop, Band and
  LFO.
- Two props reference audio modules: Audio Prop's `moduleId` and Band's
  `spectrumId`. One new prop kind, `audioModule` with an optional module type
  filter, covers both; VideoField renders it as a select of matching audio
  modules. Audio Prop's `prop` is an enum whose options depend on the chosen
  module, filled by the field from the engine's schemas.
- Cables: a control output into a control input creates a control route
  with the default range, the source's natural range into the target prop's
  schema range. The link picker goes away; the user drops a Band or Audio
  Prop module and patches it. The route's range is edited from a button on
  its edge.
- The video patch slice's `bindings` state and its three reducers go away;
  control routes use the route reducers with `kind`. Removing a module drops
  routes of both kinds on either end, which `removeForModule` already does.
- `removeBindingsForAudioModule` goes away. An Audio Prop or Band that points
  at a removed audio module outputs 0 and shows its stale reference, which is
  the same thing the audio side does with a MIDI mapping to a removed
  module.

## MIDI mapper (out of scope, direction only)

The MIDI mapper resolves its target with the audio engine's module lookup and
writes the prop object directly, so it cannot target a video module as-is.
Two ways in, both legitimate:

1. Prop control: the mapper learns to write a video prop through the video
   patch slice. Absolute, persisted, the same as a hand on the slider.
2. Modulation: a video-side MIDI control module; the host forwards CC values
   and a control route maps them.

Recommendation: 1 for the mapper. It matches how the mapper works for audio
and keeps one rule: props are the knobs and are saved; control routes are
modulation and are never written into props. `applyBindings` already keeps
that separation, and it survives as the control route evaluator.

## Wires

Control routes are routes, so drawing them is a handle question only: one
handle per declared port, in a control tone. Audio nodes stay untouched
because Audio Prop is the source; no audio node grows a handle per numeric
prop.

## Alternatives rejected

- Keeping bindings as a second edge type beside routes. Two vocabularies for
  one canvas, and the picker, the slice and the engine each carry both.
  Aligning now costs one day of saved bindings; later it costs a migration
  and a picker rewrite.
- Fields on the route for smoothing, curves and operators. Each one is a
  module in disguise, and the route stops being an edge.
- Evaluating control modules on the main thread and pushing results. Doubles
  the per-frame message traffic and moves work off the thread that already
  owns the values.
- Copying the audio engine's IO classes. They manage live Web Audio
  connections; a video route is data.
- Bipolar LFO output. The route's out range already expresses polarity.

## Testing

Video engine: LFO phase advances by `dt * frequency` and wraps; Band selects
bins by Hz and normalizes with the Spectrum's decibel range; Audio Prop
follows slider space when the schema has `exp`; a tick writes `<id>:out` and
a control route reads it in the same frame; texture modules are not ticked;
a texture route into a control input is refused; two control routes into one
prop add.

Grid: removing a control module drops routes on either end; a cable between
matching kinds is valid and a mixed or self cable is not; a control cable
gets the default range; a `video` field with a `bindings` key loads without
it.

## Order of work

1. Control routes: `kind` on `IRoute`, `outputs` on modules, `bindings`
   removed from engine, protocol and slice, `applyBindings` reading routes.
   Audio Prop as the first control module, since it restores what bindings
   did and needs no new host message. Done 2026-09-06, with `tick`, the
   frame loop change, the additive mixing rule and cables, since Audio Prop
   needs the first two, the third is three lines once routes accumulate,
   and the picker was the link feature this design retires.
2. LFO. Done 2026-09-06. Its frequency is a control input, and the engine
   resolves a control module's routes into its props before ticking it, so
   an Audio Prop can drive an LFO's rate.
3. Band, with the sample rate on the spectrum message and raw bins kept per
   Spectrum id. The fixed three bands go away with it. Done 2026-09-06. The
   analysis stays in the audio Spectrum module: many Bands on one Spectrum
   read one buffer and cost one FFT.
4. Editing a control route's range from its edge. Done 2026-09-06. Control
   routes render as a dashed control edge with a button at its middle that
   opens the range editor; the edge type is derived from the route's kind,
   so nothing about it is saved.
