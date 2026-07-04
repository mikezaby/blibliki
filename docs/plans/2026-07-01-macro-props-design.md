# Macro Props - Design Notes

## Goal

Add macro encoders that can control multiple module props at once. A macro is a
higher-level performance/editing control: moving one encoder computes values for
one or more target module props and applies them through the normal module prop
update path.

This note captures the current product direction and open questions. It is not
yet an implementation plan.

## Product Shape

- Macro encoders live in a global encoder row or similar performance surface.
  Exact placement is not part of this design yet.
- A macro is not hardcoded to the global row. Macro definitions are generic
  controller data that can be mounted onto specific encoder slots.
- The first concrete mount target is the Launch Control global row's currently
  empty encoder positions.
- The default template exposes four global-row macro encoder slots, matching
  those empty Launch Control encoder positions.
- Each macro encoder slot can be enabled or disabled.
- The user can name each macro so it is recognizable in the UI and controller
  display surfaces.
- Templates may pre-populate macro encoder slots. This is template
  configuration, not hardcoded macro behavior.
- In instrument edit mode, editing a macro encoder opens a modal.
- The modal lets the user select target module props from modules that exist in
  the current instrument/runtime graph.
- A macro can target multiple module props.
- Numeric module props are the first supported target type. Other prop kinds can
  be considered later if there is a concrete use case.

## Confirmed Decisions

- V1 macro mappings use the absolute model only. Moving a macro directly writes
  computed values to its target module props.
- Macro value is stored internally as a normalized number in the range `0..1`.
- Macro polarity is part of the macro definition:
  - `unipolar`: displayed/edited as `0..1`, default value `0`.
  - `bipolar`: displayed/edited as `-1..1`, default value `0.5` internally.
- Bipolar display maps to normalized storage:
  - display value = `value * 2 - 1`
  - stored value = `(displayValue + 1) / 2`
- Bipolar macros should visually mark the center and can snap to center when
  close enough.
- Macro mappings should reuse the existing prop-schema curve concept with
  `exp`, not introduce a separate `curve` setting.
- Mapping `min`, `max`, and `exp` are optional overrides:
  - `min === undefined`: use target prop schema `min`.
  - `max === undefined`: use target prop schema `max`.
  - `exp === undefined`: use target prop schema `exp`, or linear if absent.
  - `exp: 0`: explicitly force linear behavior.
- Mapping ranges are always stored in ascending order. `max` must be greater
  than `min`.
- `inverted` remains a dedicated boolean. It reverses the macro value before
  mapping into the ordered range, instead of representing inversion by swapping
  `min` and `max`.
- Macro application should set real module props through the existing module
  prop update mechanism. There is no separate hidden modulation layer in the
  first design.
- Manual edits to a target prop after mapping do not update macro state. The
  next macro movement writes the value produced by the macro mapping.
- The default instrument exposes four macro encoders in the global row.
- Macro storage follows the owning controller scope. A macro mounted in a global
  encoder slot is stored with global controller data. A future macro mounted in
  a track/page slot should be stored with that track/page's controller data.
- Relative macro behavior is deferred until there is a concrete performance
  workflow that needs it.

## Candidate Data Model

```ts
type MacroPolarity = "unipolar" | "bipolar";

type MacroEncoder = {
  id: string;
  name: string;
  enabled: boolean;
  value: number; // normalized 0..1
  polarity: MacroPolarity;
  mappings: MacroMapping[];
};

type MacroMapping = {
  moduleId: string;
  propKey: string;
  min?: number;
  max?: number;
  exp?: number;
  inverted?: boolean;
};

type EncoderSlotAssignment =
  | { type: "empty" }
  | { type: "globalControl"; key: string }
  | { type: "macro"; macroId: string };

type MacroControllerScope = {
  macros: MacroEncoder[];
  encoderSlots: Record<string, EncoderSlotAssignment>;
};
```

Effective mapping values:

```ts
const effectiveMin = mapping.min ?? propSchema.min;
const effectiveMax = mapping.max ?? propSchema.max;
const effectiveExp = mapping.exp ?? propSchema.exp ?? 0;
```

## Absolute Macro Model

In the absolute model, the macro directly maps its normalized value to each
target prop's effective range.

Example:

- macro value: `0..1`
- target: `filter.cutoff`
- effective range: `200..8000`
- effective `exp`: `5`

Moving the macro writes the computed cutoff value directly to
`filter.cutoff`. If the target module UI is opened after moving the macro, it
shows the changed cutoff value.

This model is simple, easy to serialize, and matches the idea of a macro as a
remote control for several low-level props. The drawback is that manual edits to
the target prop and macro movement can feel like they fight over the same value.
For v1 this trade-off is acceptable because the behavior is explicit: the macro
owns the target value whenever it moves, while normal prop editing remains the
same outside macro movement.

## Deferred: Relative Macro Model

The relative model treats the normal module prop value as a baseline and the
macro as an offset/intensity control around that baseline.

There are two possible relative interpretations:

1. Store a `baseValue` per mapping when the mapping is configured.
2. Use the current module prop value as the live base when the macro is applied.

Possible mapping shape for a stored-base version:

```ts
type RelativeMacroMapping = {
  moduleId: string;
  propKey: string;
  baseValue: number;
  minOffset?: number;
  maxOffset?: number;
  exp?: number;
};
```

Example:

- filter cutoff manually set to `1000`
- mapping base value: `1000`
- offset range: `-500..3000`
- macro minimum writes `500`
- macro center writes `1000`
- macro maximum writes `4000`

This may better match the idea that low-level module props are set by the main
encoder, while macros move relative to those values. The unresolved question is
how baseline updates should work when the target prop is manually edited after a
macro has already moved.

Relative mappings are intentionally out of scope for v1. If they are added
later, they should be introduced as an explicit mapping mode rather than by
changing the behavior of existing absolute mappings.

## Likely First Implementation Direction

Start with numeric prop targets and reuse `ModulePropSchema` for target
metadata. The macro edit modal can enumerate modules, filter their schemas to
numeric props, and create mappings that inherit schema `min`, `max`, and `exp`
unless explicitly overridden.

The first implementation should avoid a mapping mode field. Every mapping is an
absolute mapping. A future relative model can add an explicit `mode` field with
document migration only when the feature is ready.
