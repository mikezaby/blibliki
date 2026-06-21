# Track-to-Track Audio Routing Design

## Status

Draft design agreed during discussion on June 21, 2026.

## Goal

Allow an instrument track to use another track as its audio source. This gives
the musician additional filter and effect stages without expanding the fixed
block count inside one track.

The connection supports two modes:

- **Parallel**: the source track keeps its own path while also feeding the
  processing track.
- **Serial**: the source track stops routing directly to the instrument master
  and reaches the master through the processing track.

The first version intentionally keeps routing permissive and simple:

- no send-level control,
- no automatic chain repair,
- no missing-source error,
- no self-route or cycle validation,
- feedback routing is allowed,
- one processing track accepts one upstream source.

## Signal Model

Every track exposes two audio outputs:

- `audio send`: after the track's filter and FX chain, before track volume,
- `audio out`: after track volume.

A track that uses another track as its source exposes:

- `audio in`: connected directly to the filter input.

The track's generator and amp envelope are bypassed for track audio input.

### Internal-source track

```text
generator -> amp envelope -> filter -> fx1 -> fx2 -> fx3 -> fx4
                                                        |
                                                        +-> audio send
                                                        |
                                                        +-> track volume -> audio out
```

### Track-source processing track

```text
audio in -> filter -> fx1 -> fx2 -> fx3 -> fx4
                                              |
                                              +-> audio send
                                              |
                                              +-> track volume -> audio out
```

The source track's `audio send` is always used for track-to-track connections.
This makes every processing stage receive the upstream signal after its FX but
before its volume.

## Routing Modes

### Parallel

For B using A as a parallel source:

```text
A.audio send -> B.audio in
A.audio out  -> master
B.audio out  -> master
```

A's track volume controls the dry branch. B's track volume controls the
processed branch. There is no separate send-level control; the connection uses
unity gain.

### Serial

For B using A as a serial source:

```text
A.audio send -> B.audio in
B.audio out  -> master
```

A does not route its `audio out` to the master. Its track volume is therefore
not part of the serial signal path. The terminal processing track controls the
chain's final level.

Longer chains follow the same rule:

```text
A.audio send -> B.audio in
B.audio send -> C.audio in
C.audio out  -> master
```

Only C's track volume controls the final level.

### Combined serial and parallel routing

A source may have one serial destination and multiple parallel destinations:

```text
              +-> C.audio in -> C.audio out -> master
              |
A.audio send -+-> B.audio in -> B.audio out -> master
```

If B is A's serial destination, A itself does not route to master. Parallel
branches continue to route independently.

The authoring surface should prevent assigning more than one serial destination
to the same source. The compiler does not need complex graph validation. If an
externally constructed document contains multiple serial destinations, it may
route all of them and suppress the source's direct master route.

## Document Model

The receiving track owns the relationship. For `A -> B`, B records that A is
its source.

```ts
export type InstrumentTrackAudioSource =
  | {
      type: "internal";
    }
  | {
      type: "track";
      trackKey: string;
      mode: "parallel" | "serial";
    };

export type InstrumentTrackDocument = {
  key: string;
  // Existing fields...
  audioSource?: InstrumentTrackAudioSource;
};
```

`audioSource` is optional for backward compatibility. A missing value is
normalized as:

```ts
{ type: "internal" }
```

Newly created and newly saved documents should write the explicit normalized
value. The existing `sourceProfileId`, `noteSource`, sequencer configuration,
and source controller values remain stored while a track uses another track as
its source. They are dormant, not deleted, so switching back to `internal`
restores the previous generator setup.

Example serial chain:

```ts
const tracks = [
  {
    key: "A",
    audioSource: { type: "internal" },
  },
  {
    key: "B",
    audioSource: {
      type: "track",
      trackKey: "A",
      mode: "serial",
    },
  },
  {
    key: "C",
    audioSource: {
      type: "track",
      trackKey: "B",
      mode: "serial",
    },
  },
];
```

The relationship is not duplicated on the source track. The compiler derives
all destinations by inspecting enabled receiving tracks.

## Track Construction

`Track` should support two construction layouts.

### Internal layout

The existing source, amp, filter, LFO, FX, and track-gain blocks remain. The
track keeps MIDI runtime behavior and the existing controller pages.

### Processing layout

When `audioSource.type === "track"`:

- do not compile the source block,
- do not compile the amp block,
- do not create note-input runtime routes for the track,
- keep a configured step sequencer available for CC automation and sequencer
  editing, without routing notes through a voice scheduler,
- add `audio in` mapped directly to the filter input,
- keep filter, LFO, four FX blocks, and track gain,
- omit the `sourceAmp` controller page,
- keep `filterMod` and `fx`,
- keep the global track-volume mapping.

This is clearer than compiling inactive generator and envelope modules. The
saved internal-source configuration remains in the document and is restored
when the track is changed back to an internal source.

Both layouts expose:

```text
audio send -> fx4.out
audio out  -> trackGain.out
```

## Compiler Routing

Track-internal compilation remains responsible for modules, block routes, and
the signal path inside each track. Instrument-level routing is responsible for
connections between tracks and connections to the master chain.

The routing compiler operates only on enabled tracks.

### Step 1: Create track-to-track routes

For every enabled receiving track whose `audioSource.type` is `track`:

1. Find an enabled source track with the referenced `trackKey`.
2. If it exists, route its scoped `audio send` output to the receiving track's
   scoped `audio in`.
3. If it does not exist, create no route. The receiving track remains compiled
   but receives silence.

There is no error for a missing or disabled source.

### Step 2: Determine direct master routes

An enabled track routes its `audio out` to the instrument master unless another
enabled track references it in `serial` mode.

Parallel references do not suppress the source track's master route.

### Disabled-track behavior

Disabled tracks are absent from the compiled graph. Their stored relationships
do not affect enabled tracks.

For this document:

```text
A -> B -> C -> master
```

if B is disabled, the result is:

```text
A -> master
C -> master, but C is silent because it receives no audio
```

The compiler does not reconnect A directly to C and does not report an invalid
chain.

## Feedback and Invalid Graphs

The first version deliberately performs no graph validation for:

- self-routing,
- cycles,
- feedback loops,
- missing track references,
- disabled upstream tracks.

This permits experimental feedback routing. Users are responsible for
controlling gain and preventing unstable feedback.

The engine may still impose technical constraints on zero-delay feedback. This
design does not add instrument-level policy unless engine behavior proves that
one is required.

## Runtime and Persistence

Track-source selection is document configuration. Changing it rebuilds the
compiled instrument patch; it is not initially modeled as a live module-prop
update.

`createSavedInstrumentDocument` preserves the normalized `audioSource` value
along with dormant internal-source settings.

Navigation must use the pages compiled for each track rather than assuming that
every track has `sourceAmp`. A processing track begins with its first available
page, expected to be `filterMod`.

## Recommended Code Boundaries

Keep graph interpretation separate from track internals:

- `document/types.ts`: `InstrumentTrackAudioSource` public shape.
- `document/defaultDocument.ts`: explicit internal source defaults.
- `tracks/Track.ts`: internal and processing layouts plus track audio IO.
- `tracks/createTrackFromDocument.ts`: normalize source mode and choose layout.
- `compiler/instrumentAudioRouting.ts`: pure enabled-track graph interpretation
  and track-to-track/master route creation.
- `compiler/instrumentRuntimeRoutes.ts`: combine audio routes with existing MIDI,
  controller, and master-chain routes.
- `compiler/instrumentTypes.ts`: expose normalized source metadata in compiled
  track data where consumers need it.

`instrumentAudioRouting.ts` should remain a pure transform. It should not update
the engine, repair the document, or mutate track state.

## Testing

Tests should be added to existing concept-oriented files where possible.

### Track tests

Verify:

- internal tracks retain the current generator-to-master path,
- processing tracks omit source and amp modules,
- processing tracks route `audio in` directly to the filter,
- both layouts expose pre-volume `audio send` and post-volume `audio out`,
- processing tracks omit the `sourceAmp` page.

### Instrument compiler tests

Verify:

- parallel routing keeps source and destination master routes,
- serial routing suppresses the source master route,
- a serial chain routes through each processing track,
- one source can feed serial and parallel destinations,
- multiple parallel destinations compile,
- a disabled destination no longer suppresses its source master route,
- an enabled destination with a disabled or missing source compiles silently,
- cycles and self-routes are passed through without validation.

### Document and persistence tests

Verify:

- missing `audioSource` behaves as internal for old documents,
- new default tracks explicitly use internal audio sources,
- save output preserves track-source mode and dormant source configuration.

## Out of Scope

The first version does not include:

- per-connection send gain,
- multiple source tracks mixed into one processing track,
- configurable destination insertion points,
- automatic chain repair,
- graph visualization,
- feedback protection,
- cycle validation,
- live rerouting without rebuilding the patch.

These can be added later if actual instrument usage demonstrates a need.
