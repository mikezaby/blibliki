# Compressor Module Design

## Scope

Add a classic compressor to the engine, Grid, and Instrument packages. Version
one uses the native Web Audio `DynamicsCompressorNode`, includes makeup gain,
equal-power dry/wet mixing, and a live Grid gain-reduction meter. External
sidechain input is explicitly deferred because the native compressor does not
support an independent detector input.

## Engine

The engine module is a mono bus effect with this graph:

```text
                         -> compressor -> makeup gain -> wet input
input -> 6 ms dry delay -> dry input
wet input + dry input -> equal-power mixer -> output
```

The dry delay compensates for the native compressor's fixed look-ahead so
partial mix values do not combine time-misaligned signals. The module therefore
retains approximately 6 ms latency at every mix setting.

Serialized properties:

| Property | Range | Default |
| --- | --- | --- |
| threshold | -60 to 0 dB | 0 dB |
| ratio | 1:1 to 20:1 | 4:1 |
| knee | 0 to 18 dB | 6 dB |
| attack | 0 to 1 s | 0.001 s |
| release | 0 to 1 s | 0.003 s |
| makeup | -24 to 24 dB | 0 dB |
| mix | 0 to 1 | 1 |

Setter hooks update native audio parameters immediately. Makeup converts dB to
linear gain with `10 ** (dB / 20)`. The module exposes a read-only
`getReduction()` method for runtime UI inspection. Gain reduction is not module
state and is not serialized.

## Grid

Register Compressor as an available Grid module and render all seven properties
as faders. Threshold, knee, and makeup are displayed in dB; ratio is displayed
as a ratio; attack and release are displayed in seconds; mix uses the existing
Dry/50%/Wet marks.

The component reads `getReduction()` from the live engine module on animation
frames and renders a compact gain-reduction meter. It does not dispatch Redux
updates, so meter refreshes cannot dirty patch state or trigger persistence.
Unmounting stops the animation loop.

## Instrument

Add `"compressor"` to `EffectProfileId` and allow it in any of the four track FX
slots. Existing saved documents and `DEFAULT_FX_CHAIN` remain unchanged.

`CompressorBlock` creates one engine compressor with `mix: 0`, matching the
disabled-by-default behavior of existing Instrument effects. The Launch Control
XL3 FX page exposes four controls:

1. Threshold
2. Ratio
3. Makeup
4. Mix

Knee, attack, and release use the engine defaults in Instrument version one.

## Validation

Engine tests cover defaults, schema ranges, native parameter updates, makeup
conversion, mix routing, dry-path latency compensation, and gain-reduction
access. Instrument tests cover block serialization and controller-slot
compilation. Grid tests cover module registration and meter rendering. Final
verification runs package builds, focused tests, repository type checking,
linting, tests, formatting, and an in-browser Grid smoke test.
