# Filter Key Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Peak-style keyboard tracking to the filter module with a bipolar `keyTrack` prop, using middle C as the pivot and exposing the control in the grid UI.

**Architecture:** Extend `Filter` props/schema/defaults with `keyTrack`, then update `MonoFilter` so `cutoff` remains the base value and note events apply a semitone-ratio multiplier around a fixed pivot. In this codebase, the musical pivot must be stored as exact `MIDI 60`, which is named `C3` by `packages/engine/src/core/Note/index.ts`; using literal `"C4"` in tests would target `MIDI 72` and would not match Peak/minilogue-style middle-C tracking. Expose the new prop with a bipolar fader in the filter UI and verify behavior through TDD in `Filter.test.ts`.

**Tech Stack:** TypeScript, Vitest, React, Web Audio API, `@blibliki/engine`, `@blibliki/ui`

### Task 1: Add failing engine tests for key tracking

**Files:**
- Modify: `packages/engine/test/modules/Filter.test.ts`

**Step 1: Write the failing test for the new prop**

Add a construction test proving `keyTrack` is part of filter props:

```ts
it("should initialize with a custom keyTrack prop", (ctx) => {
  const filter = new Filter(ctx.engine.id, {
    name: "Filter",
    moduleType: ModuleType.Filter,
    props: {
      cutoff: 1000,
      envelopeAmount: 0.5,
      keyTrack: 0.75,
      type: "highpass",
      Q: 2,
    },
    voices: 1,
    monoModuleConstructor: () => {
      throw new Error("Not used in test");
    },
  });

  expect(filter.props.keyTrack).toBe(0.75);
});
```

**Step 2: Write the failing test for Peak-style positive tracking**

Add a note-driven behavior test using exact `MIDI 60` as the pivot:

```ts
it("tracks cutoff 1:1 from MIDI 60 when keyTrack is 1", async (ctx) => {
  const filter = new Filter(ctx.engine.id, {
    name: "Filter",
    moduleType: ModuleType.Filter,
    props: {
      cutoff: 1000,
      envelopeAmount: 0,
      keyTrack: 1,
      type: "lowpass",
      Q: 1,
    },
    voices: 1,
    monoModuleConstructor: () => {
      throw new Error("Not used in test");
    },
  });

  await waitForMicrotasks();

  const midiIn = filter.inputs.findByName("midi in");
  midiIn.onMidiEvent(MidiEvent.fromNote("C4", true, ctx.context.currentTime));

  const monoFilter = filter.audioModules[0] as Filter["audioModules"][number] & {
    audioNode: BiquadFilterNode;
  };

  expect(monoFilter.audioNode.frequency.value).toBeCloseTo(2000, 5);
});
```

Adjust the note string before committing the test so that it maps to exact `MIDI 72` or exact `MIDI 60` deliberately; the final assertion should target a note one octave above the pivot, but the test body must make the chosen MIDI number explicit.

**Step 3: Write the failing test for inverted tracking**

```ts
it("inverts cutoff tracking when keyTrack is -1", async (ctx) => {
  const filter = new Filter(ctx.engine.id, {
    name: "Filter",
    moduleType: ModuleType.Filter,
    props: {
      cutoff: 1000,
      envelopeAmount: 0,
      keyTrack: -1,
      type: "lowpass",
      Q: 1,
    },
    voices: 1,
    monoModuleConstructor: () => {
      throw new Error("Not used in test");
    },
  });

  await waitForMicrotasks();

  const midiIn = filter.inputs.findByName("midi in");
  midiIn.onMidiEvent(MidiEvent.fromNote({ name: "C", octave: 4, velocity: 1 }, true, ctx.context.currentTime));

  const monoFilter = filter.audioModules[0] as Filter["audioModules"][number] & {
    audioNode: BiquadFilterNode;
  };

  expect(monoFilter.audioNode.frequency.value).toBeCloseTo(500, 5);
});
```

Use explicit note props or a direct `MidiEvent` construction if needed so the test always documents the intended MIDI number.

**Step 4: Run the focused filter test file to verify RED**

Run: `pnpm -C packages/engine test test/modules/Filter.test.ts`

Expected: FAIL because `keyTrack` does not exist yet and note events do not change filter cutoff.

**Step 5: Commit**

```bash
git add packages/engine/test/modules/Filter.test.ts
git commit -m "test: cover filter key tracking behavior"
```

### Task 2: Implement key tracking in the engine

**Files:**
- Modify: `packages/engine/src/modules/Filter.ts`

**Step 1: Add the prop and schema**

Add `keyTrack: number` to `IFilterProps`, set the default to `0`, and extend `filterPropSchema`:

```ts
keyTrack: {
  kind: "number",
  min: -1,
  max: 1,
  step: 0.01,
  label: "Key Track",
},
```

**Step 2: Add cutoff tracking helpers**

Implement a fixed pivot and a helper that converts note distance to a cutoff multiplier:

```ts
const KEY_TRACK_PIVOT_MIDI = 60;

function getTrackedCutoff(
  cutoff: number,
  keyTrack: number,
  midiNumber?: number,
) {
  if (midiNumber === undefined || keyTrack === 0) return cutoff;

  const semitoneOffset = midiNumber - KEY_TRACK_PIVOT_MIDI;
  const tracked = cutoff * Math.pow(2, (semitoneOffset * keyTrack) / 12);

  return Math.min(MAX_FREQ, Math.max(MIN_FREQ, tracked));
}
```

**Step 3: Update `MonoFilter` to recalculate tracked cutoff**

Add a small internal helper that pushes the tracked value into `this.scale.props.current`, and call it from:
- the constructor after `this.scale` is created
- `onAfterSetCutoff`
- `onAfterSetKeyTrack`
- `triggerAttack`
- `triggerRelease`

Shape:

```ts
private updateTrackedCutoff() {
  const note = this.activeNotes[this.activeNotes.length - 1];
  this.scale.props = {
    current: getTrackedCutoff(
      this.props.cutoff,
      this.props.keyTrack,
      note?.midiNumber,
    ),
  };
}
```

In `triggerAttack` / `triggerRelease`, call `super` first, then `this.updateTrackedCutoff()`.

**Step 4: Implement the new setter hook**

Extend the implemented hooks:

```ts
onAfterSetKeyTrack: SetterHooks<IFilterProps>["onAfterSetKeyTrack"] = () => {
  this.updateTrackedCutoff();
};
```

**Step 5: Run the focused test file to verify GREEN**

Run: `pnpm -C packages/engine test test/modules/Filter.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add packages/engine/src/modules/Filter.ts packages/engine/test/modules/Filter.test.ts
git commit -m "feat: add filter key tracking"
```

### Task 3: Expose the control in the grid UI

**Files:**
- Modify: `apps/grid/src/components/AudioModule/Filter/Filter.tsx`

**Step 1: Add the new prop to the component destructure**

```ts
props: { cutoff, Q, type, envelopeAmount, keyTrack },
```

**Step 2: Add the bipolar fader**

Reuse the existing center mark pattern:

```tsx
<Fader
  name="Key Track"
  marks={AmountCenter}
  min={-1}
  max={1}
  step={0.01}
  onChange={updateProp("keyTrack")}
  value={keyTrack}
/>
```

Place it next to the existing envelope amount control so both modulation-depth controls are grouped.

**Step 3: Run a focused grid typecheck/test pass**

Run:
- `pnpm tsc`
- `pnpm test`

If root verification is too slow during this step, at minimum run the engine filter test again before moving on.

**Step 4: Commit**

```bash
git add apps/grid/src/components/AudioModule/Filter/Filter.tsx
git commit -m "feat: expose filter key tracking control"
```

### Task 4: Final verification

**Files:**
- Verify only

**Step 1: Rebuild packages if needed**

Run: `pnpm build:packages`

**Step 2: Run the repository verification commands required by the repo**

Run:
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected: all pass cleanly.

**Step 3: Review final diff**

Run:

```bash
git diff -- packages/engine/src/modules/Filter.ts packages/engine/test/modules/Filter.test.ts apps/grid/src/components/AudioModule/Filter/Filter.tsx docs/plans/2026-03-29-filter-key-tracking-implementation-plan.md
```

Confirm the diff only contains:
- filter prop/schema/default updates
- tracked cutoff logic
- filter tests
- filter UI control
- the implementation plan

**Step 4: Commit**

```bash
git add docs/plans/2026-03-29-filter-key-tracking-implementation-plan.md
git commit -m "docs: add filter key tracking implementation plan"
```
