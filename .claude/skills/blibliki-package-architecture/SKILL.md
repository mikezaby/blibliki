---
name: blibliki-package-architecture
description: Use when creating or refactoring Blibliki packages, especially when package code is hard to follow, has vague file or function names, large mixed-responsibility files, missing base abstractions, or diverges from engine-style monorepo conventions.
---

# Blibliki Package Architecture

## Overview

Blibliki packages should look like parts of one system. Prefer small, typed, human-readable units built around stable domain classes and base concepts, then extend those concepts with focused implementations.

Use `packages/engine` as the reference package: it centers behavior in named classes such as `Engine`, `Module`, `PolyModule`, `Routes`, and IO collections, while keeping pure helpers small and explicit. Do not copy engine mechanically; copy its class-first discipline.

## Core Principles

1. **Name the domain concepts first**
   - Put base concepts in their own folders before adding features.
   - Prefer durable concepts such as `Instrument`, `Track`, `Block`, `Page`, `Slot`, `InstrumentSession`, and hardware surface classes over generic process folders.

2. **Base classes own invariants**
   - A base class should manage identity, collections, lifecycle, serialization, common lookup errors, and shared registration helpers.
   - Extension classes should describe the concrete thing, not reimplement framework behavior.
   - If behavior has state, lifecycle, navigation, active selections, collections, or external synchronization, model it as a class before reaching for loose functions.

3. **Keep files single-purpose**
   - One file should have one reason to change.
   - Split files when construction, normalization, route building, display mapping, event reduction, persistence, or hardware IO live together.
   - Large files are allowed only when they are cohesive registries or intentionally central type maps.

4. **Separate domain objects, pure transforms, and side effects**
   - Domain classes should own behavior and invariants.
   - Compilers should be pure data-in/data-out.
   - Pure functions should be reserved for compilation, serialization, deterministic naming, tiny utilities, and class-internal helpers with a clear context.
   - Sessions/adapters should be the only classes that talk to live engines, devices, persistence, or callbacks.

5. **Use typed registries instead of scattered conditionals**
   - Engine uses `ModuleType`, prop schemas, mapping types, and registration helpers.
   - New packages should use equivalent typed maps for blocks, tracks, hardware profiles, templates, controller pages, and runtime modules.

6. **Make IDs and routes deterministic**
   - Runtime modules, compiled modules, routes, pages, and slots should have predictable IDs.
   - ID builders belong in small naming/scope helpers, not inline inside compilers.

7. **Tests mirror the architecture**
   - One test file per class/module/concept.
   - Put base behavior tests with the base class, implementation behavior tests with the implementation, and compiler/runtime tests beside the stage they verify.
   - Add regression tests to existing files instead of creating problem-named test files.

8. **Exports are a public contract**
   - Keep package `index.ts` organized by domain.
   - Avoid exporting helpers just because a test needs them; prefer testing through public behavior or moving stable helpers into an intentional module.

## Naming Conventions

Names should expose the concept and stage. A split into many files is not enough if the names are vague.

### Folder Names

Use folders for durable domain layers, not temporary tasks.

| Use | Avoid |
| --- | --- |
| `core/` | `helpers/` as a dumping ground |
| `compiler/` | `builders/` when the stage is compilation |
| `surfaces/launchControlXL3/` | `controller/` when the behavior is hardware-specific |
| `sessions/` | `runtime/` as a dumping ground |
| `sequencer/` or `surfaces/launchControlXL3/LaunchControlXL3SequencerEdit.ts` | `seq/` |
| `hardware/launchControlXL3/` | `midi/` when hardware-specific |

### File Names

File names should name one responsibility. Prefer nouns for concepts and verb phrases for one exported action.

| Good | Why |
| --- | --- |
| `runtimeIds.ts` | deterministic runtime module ID concept |
| `runtimeRoutes.ts` | deterministic runtime route concept |
| `midiPortSelection.ts` | normalizes and filters MIDI port selections |
| `instrumentRuntimeModules.ts` | creates runtime modules for instrument patches |
| `instrumentRuntimeRoutes.ts` | creates runtime routes for instrument patches |
| `engineSerialization.ts` | converts instrument data to engine serialized shape |
| `Instrument.ts` | central instrument domain object |
| `InstrumentNavigation.ts` | class owning active track/page/mode invariants |
| `InstrumentSession.ts` | live engine/device/persistence lifecycle |
| `LaunchControlXL3Surface.ts` | hardware-specific controller surface |
| `LaunchControlXL3SequencerEdit.ts` | hardware-specific sequencer edit behavior |

Avoid names such as `helpers.ts`, `utils.ts`, `common.ts`, `stuff.ts`, `manager.ts`, `processor.ts`, `service.ts`, `runtime.ts`, or `controller.ts` unless the package already has a precise local meaning for that word. A folder of unrelated functions is still chaotic even if the files are small.

### Function Names

Function names should state the action and output.

| Prefix | Use for | Example |
| --- | --- | --- |
| `create*` | constructing new data or instances | `createInstrumentRuntimeModuleId` |
| `compile*` | pure domain-to-compiled transform | `compileTrack` |
| `serialize*` / `to*` | converting to an external/public shape | `toEngineSerializableModule` |
| `normalize*` | filling defaults and clamping into valid shape | `normalizePortSelection` |
| `resolve*` | looking up a required value, often throwing if missing | `resolveActiveTrack` |
| `find*` | lookup that may return undefined/null | `findMidiInputDeviceByFuzzyName` |
| `reduce*` | event/state reducer returning next state and command | `reduceInstrumentControllerEvent` |
| `sync*` | side-effect synchronization with live systems | `syncSeqEditStepButtonLeds` |
| `apply*` | applying an event/change to immutable state | `applySeqEditEncoderEvent` |

Avoid vague verbs like `handle`, `process`, `do`, `make`, `build`, and `update` when a more exact verb exists. `handleMidiEvent` is acceptable only at a session boundary where it coordinates multiple commands; inside reducers, prefer `reduceMidiEvent` or `applyMidiEvent`.

### Class and Type Names

Class names should be used for concepts with identity, lifecycle, collections, navigation, active selections, synchronization, or invariants. Prefer functions only for pure transforms and tiny utilities.

| Use classes for | Examples |
| --- | --- |
| base invariants | `BaseBlock`, `BaseTrack`, `Module`, `PolyModule` |
| concrete domain implementations | `OscBlock`, `Track`, `MonoGain`, `Gain` |
| aggregate domain objects | `Instrument`, `InstrumentNavigation` |
| live/session objects with lifecycle | `InstrumentSession`, `LaunchControlXL3Surface` |

Use type names for public shapes and contracts:

```typescript
type InstrumentRuntimeState = { ... };
type CompiledInstrumentEnginePatch = { ... };
type CreateInstrumentEnginePatchOptions = { ... };
```

Avoid classes named `Manager`, `Controller`, `Service`, or `Processor` unless they own a specific, named lifecycle. Prefer `InstrumentSession` over `ControllerManager`, `LaunchControlXL3Surface` over `ControllerRuntime`, and `engineSerialization.ts` over `EngineSerializationService`.

### Test Names

Test file names should mirror the concept under test:

| Good | Avoid |
| --- | --- |
| `runtimeIds.test.ts` | `IdHelpers.test.ts` |
| `instrumentRuntimeRoutes.test.ts` | `RouteBug.test.ts` |
| `sequencerEdit.test.ts` or `stepUpdates.test.ts` | `SeqEditRefactor.test.ts` |
| `BaseTrack.test.ts` | `TrackInternals.test.ts` |
| `InstrumentNavigation.test.ts` | `RuntimeNavigationCleanup.test.ts` |

Test names should describe behavior in human language:

```typescript
it("excludes the selected controller from all note inputs", () => {});
it("creates deterministic track runtime module ids", () => {});
```

Do not name tests after implementation phases, bugs, or cleanup work.

## Pipeline Pattern

Make the package pipeline explicit before adding files. A package should read left to right:

```text
document/config -> domain model -> compiler -> serialized runtime data -> domain runtime object -> session/adapters -> app/device side effects
```

For `packages/instrument`, that means:

```text
InstrumentDocument
  -> Instrument/Track/Block/Page/Slot model
  -> compiled instrument and compiled track data
  -> Engine patch serialization
  -> Instrument and InstrumentNavigation runtime objects
  -> InstrumentSession and live engine updates
  -> MIDI hardware, persistence, UI callbacks
```

Do not let a later stage reach backward into construction details, and do not let an earlier stage call live devices.

## Common Patterns

### Serialization

Base classes should own serialization shape when they own the collections. Extensions should register data, not rebuild serialization.

```typescript
type SerializedThing = {
  key: string;
  items: Item[];
};

abstract class BaseThing {
  protected readonly items = new Map<string, Item>();

  addItem(item: Item) {
    this.items.set(item.key, item);
    return item;
  }

  serialize(): SerializedThing {
    return {
      key: this.key,
      items: Array.from(this.items.values()),
    };
  }
}
```

Use this for blocks/tracks/pages when the class owns maps such as modules, routes, slots, inputs, and outputs. Keep engine patch serialization in a compiler helper when converting domain objects to another package's serialized format.

### Deterministic IDs and Routes

IDs are part of the runtime contract. Put naming helpers in one small module and test behavior through serialized output.

```typescript
export function createRuntimeModuleId(scope: string, suffix: string) {
  return `${scope}.runtime.${suffix}`;
}

export function createRouteId(scope: string, source: Plug, destination: Plug) {
  return `${scope}:${source.moduleId}.${source.ioName}->${destination.moduleId}.${destination.ioName}`;
}
```

Avoid inline string building inside compilers. If route IDs change accidentally, saved patches and tests become noisy.

### Pure Compiler

A compiler should accept plain data and return plain data. It should not hold session state, subscribe to devices, call engine methods, or mutate the document.

```typescript
export function compileThing(document: ThingDocument): CompiledThing {
  const model = createThingFromDocument(document);
  return {
    key: model.key,
    serialized: model.serialize(),
  };
}
```

If a compiler needs runtime modules or routes, split factories into files such as `runtimeModules.ts`, `runtimeRoutes.ts`, and `engineSerialization.ts`.

### Domain Runtime Object and Session Boundary

Runtime behavior should start as a named domain class. Use a reducer function only when it is a small implementation detail inside that class or when the event transform is naturally stateless.

```typescript
class InstrumentNavigation {
  constructor(private readonly state: InstrumentNavigationState) {}

  navigate(action: InstrumentNavigationAction): InstrumentNavigation {
    return new InstrumentNavigation(normalizeNavigation(this.state, action));
  }

  serialize(): InstrumentNavigationState {
    return this.state;
  }
}
```

The session layer may call `engine.updateModule`, send MIDI LED events, persist drafts, and notify UI callbacks. Domain classes should be testable without an engine instance or MIDI device.

### Typed Registry

Use registries when adding a new implementation should follow one predictable path.

```typescript
export const blockRegistry = {
  osc: OscBlock,
  wavetable: WavetableBlock,
  drumMachine: DrumMachineBlock,
} satisfies Record<SourceProfileId, new (...args: never[]) => BaseBlock>;
```

Do not introduce a registry only to hide imports. Add it when it removes scattered conditionals or makes extension safer.

## Refactor Workflow

1. Read the target package structure and list the files with mixed responsibilities.
2. Compare against `packages/engine/src`: base abstractions, implementation folders, typed registries, and tests.
3. Propose the target folder boundaries before editing.
4. Extract one responsibility at a time behind existing public APIs.
5. Keep tests green after each extraction; add tests only to the existing concept test file.
6. Run package-level checks first, then monorepo checks before finishing.

## Red Flags

- A compiler creates modules, normalizes options, builds routes, creates runtime IDs, and assembles public runtime state in one file.
- A runtime file both reduces controller events and calls live engine/device APIs.
- Hardware-specific CC numbers are mixed into package-generic runtime logic.
- A base class contains product-specific behavior that only one extension uses.
- A test file is named after a bug or implementation phase instead of the concept under test.

## Package Check

Before accepting a new package structure, verify:

- Can a human find the base abstraction in under 30 seconds?
- Can a human add one implementation without touching unrelated runtime/session code?
- Can compiler code run without live devices or engine instances?
- Can runtime state transitions be tested without MIDI hardware?
- Are package exports grouped and intentional?
