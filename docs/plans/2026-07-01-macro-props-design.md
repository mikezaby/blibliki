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
- In instrument edit mode, editing a macro encoder opens a modal.
- The modal lets the user select target module props from modules that exist in
  the current instrument/runtime graph.
- A macro can target multiple module props.
- Numeric module props are the first supported target type. Other prop kinds can
  be considered later if there is a concrete use case.

## Confirmed Decisions

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
- Macro application should set real module props through the existing module
  prop update mechanism. There is no separate hidden modulation layer in the
  first design.

## Candidate Data Model

```ts
type MacroPolarity = "unipolar" | "bipolar";

type MacroEncoder = {
  id: string;
  name: string;
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

## Relative Macro Model

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

## Open Questions

- Should v1 implement only the absolute model, only the relative model, or
  support both with a mapping mode?
- If relative mappings exist, should their baseline be stored per mapping or
  derived from the current module prop value?
- When a user manually edits a prop targeted by a macro, should that edit update
  the macro baseline, leave the macro mapping untouched, or create an
  out-of-sync state until the macro moves again?
- Should `inverted` remain a dedicated boolean, or should users express
  inversion by swapping `min` and `max`?
- Where should macro definitions live in the saved instrument document: global
  block, track/instrument controller block, or a dedicated macro block?
- How many macro encoders should the default instrument expose?

## Likely First Implementation Direction

Start with numeric prop targets and reuse `ModulePropSchema` for target
metadata. The macro edit modal can enumerate modules, filter their schemas to
numeric props, and create mappings that inherit schema `min`, `max`, and `exp`
unless explicitly overridden.

Before implementation, decide whether the macro should be absolute or relative.
That choice affects the saved document schema, the macro edit UI, and how manual
prop edits interact with macro movement.
