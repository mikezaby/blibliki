# LFO Modulation Matrix — Design

Date: 2026-07-07

## Problem

Every instrument track already builds an `LfoBlock` (`lfo1`), and the LFO
engine module is fully working (bipolar `out`, poly, BPM-syncable). But:

1. The LFO's `out` **routes to nothing** — it modulates nothing today.
2. There is **no LFO card** in the instrument editor
   (`InstrumentEditor.tsx`), so its params aren't editable there.
3. There is **no way to choose what the LFO modulates**.

Goal: let the user route the LFO to one or more destinations, each with its
own depth (a mod matrix), and edit the LFO + matrix from the editor.

## Decisions (confirmed with user)

- **Mod matrix**: an LFO can drive multiple destinations at once, each with
  its own depth.
- **v1 destinations**: Amp Gain, Filter Cutoff, Filter Q — the three that
  already have clean modulation inputs, so **no engine changes**.
- Single LFO source (`lfo1`) for now.

## Key engine facts that shape the design

- `IRoute` is `{ id, source, destination }` — **no depth field**. Per-route
  depth therefore needs a real gain node in the graph.
- Clean modulation inputs that already exist at the block level:
  - `amp` block input `gain` → gain node's `gain` AudioParam (base 1).
  - `filter` block input `cutoff` → filter `frequency` AudioParam (base fed
    by the cutoff Scale; LFO sums in **Hz**, linear).
  - `filter` block input `Q` → filter `Q` AudioParam.
- **Avoid** `filter.cutoffMod`: it feeds *through* the filter's
  envelope-amount gain, so it's silenced whenever `envelopeAmount = 0`. Use
  the clean `cutoff` input instead.
- Compilation path: `createTrackFromDocument(doc)` builds a `Track`
  (static blocks + routes) → `applyControllerSlotValues` overrides prop
  values → `compileTrackEngine` flattens `block.modules` + block/track routes
  into the engine patch. The matrix is document-specific **structure**, so it
  belongs right next to `applyControllerSlotValues`.

## Data model

New optional field on `InstrumentTrackDocument` (in **both** copies:
`packages/instrument/src/document/types.ts` and the app's duplicate
`apps/grid/src/instruments/document.ts`):

```ts
export type LfoModDestination = "ampGain" | "filterCutoff" | "filterQ";
export type LfoModRoute = { destination: LfoModDestination; depth: number }; // depth -1..1

// on InstrumentTrackDocument:
modulation?: LfoModRoute[];
```

`depth` is bipolar `-1..1` (negative inverts) — one slider, and inversion is
free. Optional field ⇒ existing documents need no migration.

## Destination registry (instrument package, new file `document/modulation.ts`)

```ts
export const LFO_MOD_DESTINATIONS: Record<
  LfoModDestination,
  { label: string; block: BlockKey; ioName: string; range: number }
> = {
  ampGain:      { label: "Amp Gain",      block: "amp",    ioName: "gain",   range: 1 },
  filterCutoff: { label: "Filter Cutoff", block: "filter", ioName: "cutoff", range: 8000 },
  filterQ:      { label: "Filter Q",      block: "filter", ioName: "Q",      range: 20 },
};
```

`range` maps `depth = 1.0` to that many native units of swing (Hz for
cutoff, gain units for amp, Q units for Q). Exported from the package index
so the editor can build the dropdown and filter by available blocks.

## Compilation — synthesize a depth gain per active row

New step `applyModulationMatrix(track, modulation)` called inside
`createTrackFromDocument` after `applyControllerSlotValues`. For each row `i`
with a valid destination (skip if the target block is absent, e.g. amp on a
non-internal track):

1. `dest = LFO_MOD_DESTINATIONS[row.destination]`.
2. On the `lfo1` block, add a synthesized `Gain` module
   `lfo1.mod{i}` with `voices` copied from `lfo1.main`,
   `props.gain = row.depth * dest.range`, and a unique `slotSuffix`
   (`Mod{i}`) so its auto-created prop slot doesn't collide.
3. Block-internal route: `lfo1.main.out → lfo1.mod{i}.in`.
4. Expose block output `mod{i}` → `{ moduleId: lfo1.mod{i}, ioName: "out" }`.
5. Track route: `{ blockKey: "lfo1", ioName: "mod{i}" } →
   { blockKey: dest.block, ioName: dest.ioName }`.

Signal path per row: `LFO(-1..1)×amount → depthGain(×depth×range) → target
param`. Depth is baked into the gain's prop at compile time — no
`controllerSlotValues` entry needed. Everything else (module cloning, block +
track route expansion) is handled by the existing compiler.

## Editor UI (`InstrumentEditor.tsx`)

Add an **LFO card** after the Filter card:

- Reuse the existing `AudioModule/LFO` component, fed
  `controllerModulePropsById.get("lfo1.main")` and
  `makeBlockUpdateProp<ModuleType.LFO>("lfo1")` (LFO param edits go through
  the normal slot mechanism, exactly like Filter/Amp).
- **Matrix section**: render `activeTrack.modulation ?? []` as rows —
  destination `OptionSelect` (options from `LFO_MOD_DESTINATIONS`, filtered to
  blocks present on the track) + a depth `Fader` (`-1..1`) + a remove button;
  plus an "Add destination" button.
- Row edits call the existing `setTrackChanges({ modulation: nextRows })`
  (`modulation` is just a field on the track document, so `updateTrackDocument`
  already covers it — **no new editorState helper**). `compiledActiveTrack`
  recomputes automatically, so audio updates live.

## Files touched

- `packages/instrument/src/document/types.ts` — add types + `modulation` field.
- `packages/instrument/src/document/modulation.ts` — **new**: registry.
- `packages/instrument/src/tracks/createTrackFromDocument.ts` —
  `applyModulationMatrix`.
- `packages/instrument/src/index.ts` — export types + registry.
- `apps/grid/src/instruments/document.ts` — mirror `modulation` field.
- `apps/grid/src/components/Instruments/InstrumentEditor.tsx` — LFO card +
  matrix UI.

## Deliberately skipped (YAGNI, note the upgrade path)

- **Single LFO** (`lfo1` hardcoded). Add an `lfoKey` to `LfoModRoute` when a
  second LFO exists.
- **Pitch / other destinations** — data-driven registry, add a row + block
  input plug when needed.
- **Musical (octave) cutoff modulation** — v1 uses linear Hz via the clean
  `cutoff` input. A musical path needs an engine input into the cutoff Scale.
- **Per-destination waveform/rate** — one LFO shape drives all its rows.

## Test / verification

- Engine/instrument: unit test on `createTrackFromDocument` — a document with
  a `modulation` row produces the synthesized depth gain module + the two
  routes (block-internal + track), with `gain = depth × range`; and an
  `ampGain` row on a non-internal track is skipped.
- Manual: in the grid instrument editor, add each destination, confirm audible
  modulation and that depth 0 / removing the row silences it.
