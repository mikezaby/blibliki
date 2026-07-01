# Master Track — Design

## Goal

Remove the hardcoded global effect chain (master filter, global delay, global
reverb, master volume) from the instrument and replace it with a real **master
track** — a first-class, editable track that all other tracks feed into. The
master track reuses the existing track-to-track audio-chain mechanism
(`audioSource.type: "track"`), so it is edited and navigated like any other
track and can grow new functionality later.

## Decisions

- **Representation:** a real entry in `document.tracks`, not a hardcoded
  singleton. Editable/navigable through the normal track pages and compiler
  paths.
- **Identification:** a new discriminated `InstrumentTrackAudioSource` variant
  `{ type: "master" }`. `createTrackFromDocument` maps `"master"` onto the
  existing `"track"` input behavior, so `Track.ts` is unchanged (it already
  builds `audio in → filter → fx1..fx4 → trackGain → audio out` for
  non-internal tracks).
- **Global row:** drop the four effect knobs (master filter cutoff/resonance,
  reverb send, delay send). Keep `tempo`, `swing`, `probabilityAmount`, and
  **Main Volume**. The Main Volume knob drives the master track's `trackGain`.
- **Default fx:** a brand-new master track is **clean** (fxChain all `none`,
  filter open, gain 0 dB). Existing saved patches migrate their old effect
  values onto the master track so they keep their current sound.

## Audio graph

Before (four hardcoded modules):

```
tracks -> masterFilter -> globalDelay -> globalReverb -> masterVolume -> engine Master
                                                              `-> sessionRecorder (tap)
```

After (master track replaces the four modules):

```
tracks -> master track (audio in > filter > fx1-4 > trackGain > audio out) -> engine Master
                                                                   `-> sessionRecorder (tap)
```

## Routing changes

- `instrumentAudioRouting.ts` `createDirectMasterRoutes`: mix destination
  becomes the master track's scoped `"audio in"` instead of
  `{ masterFilterId, "in" }`. The master track is **excluded** from the mixed
  sources so it does not feed itself.
- Serial/parallel track-to-track chaining is unchanged; only non-serial track
  outputs hit the mix bus.
- `instrumentRuntimeRoutes.ts` `createMasterRoutes`: delete the three
  inter-effect routes; add master track `"audio out"` -> engine `masterId`;
  retarget the sessionRecorder tap to master track `"audio out"`.

## Document schema, defaults, migration

- `InstrumentGlobalBlock` shrinks to `{ tempo, swing, probabilityAmount,
  masterVolume }`. Removed: `masterFilterCutoff`, `masterFilterResonance`,
  `reverbSend`, `delaySend`.
- New audioSource variant `{ type: "master" }`.
- `defaultDocument.ts`: shrink globalBlock; append one master track
  (`key: "master"`, `audioSource: { type: "master" }`,
  `sourceProfileId: "unassigned"`, clean fxChain). `defaultTemplate.trackCount`
  stays `8` (note tracks); the master track is appended, not counted as a note
  track.
- `version.ts` migration v2 -> **v3**: append a master track whose
  `controllerSlotValues` carry the old values —
  `filter.cutoff`/`filter.Q` <- old `masterFilterCutoff`/`Resonance`;
  `fx1` (delay) mix <- `delaySend`; `fx2` (reverb) mix <- `reverbSend`.
  `masterVolume` preserved as-is in the shrunk globalBlock. Existing v1->v2
  masterVolume dB normalization still runs first.
- `SavedInstrumentDocument.ts`: delete the four global module reads in
  `createSavedGlobalBlock`; `masterVolume` reads from `master.trackGain.main`.
  Master track fx/filter values round-trip via the existing
  `createSavedControllerSlotValues` track path.

## Hardware / mappings / display

- `globalRow.ts`: drop the four effect controls;
  `getGlobalControlValueSpec` loses those cases. `InstrumentGlobalControlKey`
  stays `keyof InstrumentGlobalBlock` (still valid; `masterVolume` remains).
- `createInstrumentMidiMapperProps.ts`:
  - `createInstrumentEncoderGlobalMappings`: remove the four effect cases;
    `masterVolume` retargets `moduleId` -> `${masterTrackKey}.trackGain.main`.
    `InstrumentGlobalMappingRuntimeIds` drops the four removed ids.
  - `createInstrumentFaderGlobalMappings`: exclude the master track so the
    eight note-track faders (CC 5-12) are unchanged.
- `LiveInstrumentDisplayState.ts`: remove the four removed-module reads.
  `InstrumentDisplayState.ts` follows the shorter global row automatically.

## Runtime plumbing (deletions)

- `instrumentRuntimeModules.ts`: drop `createMasterFilterModule`,
  `createGlobalDelayModule`, `createGlobalReverbModule`,
  `createMasterVolumeModule`.
- `createInstrumentRuntimeModules.ts`: drop the four calls.
- `runtimeIds.ts`: drop `masterFilterId`, `globalDelayId`, `globalReverbId`,
  `masterVolumeId`. Keep `masterId`, `sessionRecorderId`.

## Navigation

The master track is in `tracks[]`, so it is navigable like any track. It
exposes `filterMod` + `fx` pages (no `sourceAmp`, since it is not internal).
`getTrackPageMappings` already falls back to `trackMappings[0]` when
`sourceAmp` is absent.

## Testing

- Update instrument compiler/routing tests for the new bus.
- Add tests asserting:
  1. all note-track outputs route to `master.audio in`;
  2. `master.audio out` -> engine Master;
  3. migration v2 -> v3 preserves old effect values on the master track.
