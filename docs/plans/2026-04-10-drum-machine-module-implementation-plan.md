# Drum Machine Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generated `DrumMachine` engine module with eight classic drum voices, fixed MIDI note mapping, a summed default output, separate per-voice outputs, and a minimal grid UI.

**Architecture:** Implement `DrumMachine` as a regular `Module<ModuleType.DrumMachine>` that listens to `midi in`, maps incoming note numbers to voice-specific one-shot Web Audio graphs, and routes each trigger into both a dedicated voice bus and a master summed bus. Keep `v1` intentionally flat and simple: one module file owns the runtime graph, one engine test file verifies note mapping and audio behavior, and one grid component exposes grouped `level`, `decay`, and `tone` controls without introducing new engine abstractions.

**Tech Stack:** TypeScript, Vitest, React, Redux Toolkit, Web Audio API, `@blibliki/engine`, `@blibliki/ui`

## Notes Before Execution

- Use `superpowers:using-git-worktrees` before implementation work in a new execution session.
- Use `superpowers:test-driven-development` during each task. Write RED tests first, then implement the smallest code that makes them pass.
- Keep `DrumMachine` self-contained in `v1`. Do not add a custom AudioWorklet or new shared engine abstractions unless a concrete test forces it.
- Current repo baseline on `2026-04-10`: root `pnpm test` already fails in unrelated `packages/instrument` and `packages/pi` suites. Final verification for this feature must prove the new drum-machine tests pass and that root failures do not expand beyond the current baseline.

### Task 1: Add RED engine tests for module shape and note routing

**Files:**

- Create: `packages/engine/test/modules/DrumMachine.test.ts`
- Reference: `packages/engine/test/testSetup.ts`
- Reference: `packages/engine/test/utils/audioWaits.ts`
- Reference: `packages/engine/test/utils/waitForCondition.ts`

**Step 1: Write the failing construction and IO tests**

Add tests that verify:

- `ModuleType.DrumMachine` can be constructed through `createModule`
- the module exposes `midi in`
- the module exposes `out`
- the module exposes all dedicated outputs:
  - `kick out`
  - `snare out`
  - `tom out`
  - `cymbal out`
  - `cowbell out`
  - `clap out`
  - `open hat out`
  - `closed hat out`

Shape:

```ts
it("registers summed and per-voice outputs", (ctx) => {
  const drumMachine = createModule(ctx.engine.id, {
    name: "drums",
    moduleType: ModuleType.DrumMachine,
    props: {},
  }) as DrumMachine;

  expect(drumMachine.inputs.findByName("midi in")).toBeDefined();
  expect(drumMachine.outputs.findByName("out")).toBeDefined();
  expect(drumMachine.outputs.findByName("kick out")).toBeDefined();
  expect(drumMachine.outputs.findByName("closed hat out")).toBeDefined();
});
```

**Step 2: Write the failing default-props test**

Verify that `masterLevel` plus the per-voice `level`, `decay`, and `tone` props exist and are initialized.

Shape:

```ts
expect(drumMachine.props.kickLevel).toBeDefined();
expect(drumMachine.props.snareDecay).toBeDefined();
expect(drumMachine.props.openHatTone).toBeDefined();
```

**Step 3: Write the failing note-map tests**

Add focused tests for:

- `C1` triggers kick
- `D1` triggers snare
- `D#1` triggers clap
- `F#1` triggers closed hat
- `A1` triggers tom
- `A#1` triggers open hat
- `C#2` triggers cymbal
- `G#2` triggers cowbell
- an unmapped note produces no output

Use one `Inspector` on the summed output and one on the dedicated output under test. Trigger notes through `midi in`.

Shape:

```ts
const midiIn = drumMachine.inputs.findByName("midi in");
midiIn.onMidiEvent(MidiEvent.fromNote("C1", true, ctx.context.currentTime));
```

For output assertions, use `waitForInspectorPeakAbove()` or `waitForInspectorValue()` instead of exact waveform snapshots.

**Step 4: Run the focused test file to verify RED**

Run: `pnpm -C packages/engine test test/modules/DrumMachine.test.ts`

Expected: FAIL because `ModuleType.DrumMachine`, the module file, and the registry entries do not exist yet.

**Step 5: Commit**

```bash
git add packages/engine/test/modules/DrumMachine.test.ts
git commit -m "test: add drum machine module coverage"
```

### Task 2: Register the module type and add a minimal engine skeleton

**Files:**

- Create: `packages/engine/src/modules/DrumMachine.ts`
- Modify: `packages/engine/src/modules/index.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/modules/DrumMachine.test.ts`

**Step 1: Add the flat prop type and schema**

In `packages/engine/src/modules/DrumMachine.ts`, define:

- `export type IDrumMachine = IModule<ModuleType.DrumMachine>;`
- `export type IDrumMachineProps = { ... }`
- `export const drumMachinePropSchema: ModulePropSchema<IDrumMachineProps> = { ... }`

Start with this prop surface:

```ts
type IDrumMachineProps = {
  masterLevel: number;
  kickLevel: number;
  kickDecay: number;
  kickTone: number;
  snareLevel: number;
  snareDecay: number;
  snareTone: number;
  tomLevel: number;
  tomDecay: number;
  tomTone: number;
  cymbalLevel: number;
  cymbalDecay: number;
  cymbalTone: number;
  cowbellLevel: number;
  cowbellDecay: number;
  cowbellTone: number;
  clapLevel: number;
  clapDecay: number;
  clapTone: number;
  openHatLevel: number;
  openHatDecay: number;
  openHatTone: number;
  closedHatLevel: number;
  closedHatDecay: number;
  closedHatTone: number;
};
```

Use normalized `tone: 0..1`, `decay: 0.01..4`, and `level: 0..1.5`.

**Step 2: Add the minimal module skeleton**

Implement a `DrumMachine` class that:

- extends `Module<ModuleType.DrumMachine>`
- does not use `registerDefaultIOs()`
- registers `midi in` manually
- creates one `GainNode` for the master bus
- creates one `GainNode` per voice bus
- connects every voice bus into the master bus
- registers `out` from the master bus
- registers each dedicated output from the voice bus

Shape:

```ts
private readonly masterBus: GainNode;
private readonly voiceBuses: Record<DrumVoice, GainNode>;

constructor(engineId: string, params: ICreateModule<ModuleType.DrumMachine>) {
  const props = { ...DEFAULT_PROPS, ...params.props };
  super(engineId, { ...params, props });

  this.masterBus = new GainNode(this.context.audioContext, {
    gain: props.masterLevel,
  });

  this.voiceBuses = createVoiceBuses(this.context.audioContext);
  Object.values(this.voiceBuses).forEach((bus) => bus.connect(this.masterBus));

  this.registerIOs();
}
```

**Step 3: Register the module everywhere in the engine**

In `packages/engine/src/modules/index.ts`:

- import `DrumMachine`, `IDrumMachineProps`, and `drumMachinePropSchema`
- add `ModuleType.DrumMachine`
- add `ModuleTypeToPropsMapping[ModuleType.DrumMachine]`
- add `ModuleTypeToStateMapping[ModuleType.DrumMachine] = never`
- add `ModuleTypeToModuleMapping[ModuleType.DrumMachine]`
- add `moduleSchemas[ModuleType.DrumMachine]`
- export the new types
- add a `createModule()` switch case

In `packages/engine/src/index.ts`:

- export `IDrumMachine` and `IDrumMachineProps`

**Step 4: Run the focused test file to verify GREEN for construction**

Run: `pnpm -C packages/engine test test/modules/DrumMachine.test.ts`

Expected: the construction, schema, and IO tests pass; note-routing tests still fail because triggering is not implemented yet.

**Step 5: Commit**

```bash
git add packages/engine/src/modules/DrumMachine.ts packages/engine/src/modules/index.ts packages/engine/src/index.ts packages/engine/test/modules/DrumMachine.test.ts
git commit -m "feat: register drum machine module skeleton"
```

### Task 3: Implement per-voice one-shot synthesis and note mapping

**Files:**

- Modify: `packages/engine/src/modules/DrumMachine.ts`
- Test: `packages/engine/test/modules/DrumMachine.test.ts`

**Step 1: Add a fixed note map and voice type**

Keep the map private to the module file:

```ts
type DrumVoice =
  | "kick"
  | "snare"
  | "tom"
  | "cymbal"
  | "cowbell"
  | "clap"
  | "openHat"
  | "closedHat";

const NOTE_TO_VOICE: Record<number, DrumVoice> = {
  36: "kick",
  38: "snare",
  39: "clap",
  42: "closedHat",
  45: "tom",
  46: "openHat",
  49: "cymbal",
  56: "cowbell",
};
```

**Step 2: Add a cached noise buffer and trigger helpers**

Keep `v1` simple and local to `DrumMachine.ts`:

- one `createNoiseBuffer()` helper
- one `playVoice(voice, velocity, triggeredAt)` dispatcher
- one synthesis helper per voice:
  - `triggerKick`
  - `triggerSnare`
  - `triggerTom`
  - `triggerClap`
  - `triggerCowbell`
  - `triggerCymbal`
  - `triggerOpenHat`
  - `triggerClosedHat`

Each helper should:

- create the short-lived nodes it needs
- connect into `this.voiceBuses[voice]`
- schedule amplitude automation from `triggeredAt`
- stop or disconnect nodes after the tail is finished

**Step 3: Start with the smallest musically useful recipes**

Use the design doc, but keep the first pass minimal:

- kick: sine oscillator + pitch sweep + amp envelope
- snare: filtered noise + short tonal body
- tom: pitched oscillator + soft pitch sweep
- clap: filtered noise + burst envelope pattern
- cowbell: two square oscillators
- cymbal: bright metallic/noise hybrid
- open/closed hats: shared metallic/noise core with different decay

Do not add extra tune/snappy/mode props in `v1`.

**Step 4: Override `triggerAttack()`**

Read the mapped voice from `note.midiNumber`, scale the hit by note velocity, and ignore unmapped notes.

Shape:

```ts
triggerAttack(note: Note, triggeredAt: ContextTime) {
  super.triggerAttack(note, triggeredAt);

  const voice = NOTE_TO_VOICE[note.midiNumber];
  if (!voice) return;

  this.playVoice(voice, note.velocity ?? 1, triggeredAt);
}
```

Leave `triggerRelease()` as a no-op in `v1`.

**Step 5: Run the focused engine test file to verify GREEN**

Run: `pnpm -C packages/engine test test/modules/DrumMachine.test.ts`

Expected: construction, default-props, note-map, unmapped-note, and dedicated-output tests pass.

**Step 6: Commit**

```bash
git add packages/engine/src/modules/DrumMachine.ts packages/engine/test/modules/DrumMachine.test.ts
git commit -m "feat: add drum machine voice synthesis"
```

### Task 4: Add runtime behavior coverage for velocity, prop updates, and hi-hat choke

**Files:**

- Modify: `packages/engine/test/modules/DrumMachine.test.ts`
- Modify: `packages/engine/src/modules/DrumMachine.ts`

**Step 1: Write failing velocity and summed-output tests**

Add tests that prove:

- lower-velocity hits produce lower peak output than high-velocity hits
- `out` carries the summed kit mix
- a voice-specific output stays isolated from other voices

For velocity, construct notes with explicit props:

```ts
MidiEvent.fromNote({ name: "C", octave: 1, velocity: 0.3 }, true, now);
```

**Step 2: Write failing prop-update tests**

Add focused tests for:

- increasing `kickLevel` increases peak output
- increasing `snareDecay` extends the observable tail
- moving `closedHatTone` changes the filtered brightness enough to shift the observed peak or sustained energy

Do not try to snapshot exact spectra. Use relative comparisons from `Inspector` output and short observation windows.

**Step 3: Write the failing hi-hat choke test**

Test sequence:

1. trigger `openHat`
2. wait until its output is clearly audible
3. trigger `closedHat`
4. verify the existing open-hat tail drops quickly after the closed-hat trigger

**Step 4: Implement prop application and choke bookkeeping**

In `DrumMachine.ts`:

- add `onAfterSetMasterLevel`
- keep synthesis helpers reading current per-voice props at trigger time
- store active open-hat cleanup handles or gain nodes in a small collection
- add `chokeOpenHats(triggeredAt)` and call it before `triggerClosedHat()`

Shape:

```ts
private activeOpenHats = new Set<DisposableVoice>();

private chokeOpenHats(triggeredAt: ContextTime) {
  for (const voice of this.activeOpenHats) {
    voice.outputGain.gain.cancelScheduledValues(triggeredAt);
    voice.outputGain.gain.setTargetAtTime(0, triggeredAt, 0.005);
    voice.disposeSoon(triggeredAt + 0.05);
  }
}
```

**Step 5: Run the focused engine test file to verify GREEN**

Run: `pnpm -C packages/engine test test/modules/DrumMachine.test.ts`

Expected: all drum-machine engine tests pass.

**Step 6: Commit**

```bash
git add packages/engine/src/modules/DrumMachine.ts packages/engine/test/modules/DrumMachine.test.ts
git commit -m "feat: add drum machine dynamics and hat choke"
```

### Task 5: Add the grid UI and register the module in the editor

**Files:**

- Create: `apps/grid/src/components/AudioModule/DrumMachine.tsx`
- Modify: `apps/grid/src/components/AudioModule/index.tsx`
- Modify: `apps/grid/src/components/AudioModule/modulesSlice.ts`
- Create: `apps/grid/test/AudioModule/DrumMachine.test.tsx`
- Modify: `apps/grid/test/AudioModule/availableModules.test.ts`

**Step 1: Add the module to the grid registries**

Update:

- `COMPONENT_MAPPING` in `apps/grid/src/components/AudioModule/index.tsx`
- `AvailableModules` in `apps/grid/src/components/AudioModule/modulesSlice.ts`

Use display name `Drum Machine`.

**Step 2: Build a minimal grouped UI component**

In `apps/grid/src/components/AudioModule/DrumMachine.tsx`, use one local `VOICES` array and render repeated fader groups rather than hand-writing 24 controls.

Suggested shape:

```tsx
const VOICES = [
  { key: "kick", label: "Kick" },
  { key: "snare", label: "Snare" },
  { key: "tom", label: "Tom" },
  { key: "cymbal", label: "Cymbal" },
  { key: "cowbell", label: "Cowbell" },
  { key: "clap", label: "Clap" },
  { key: "openHat", label: "Open Hat" },
  { key: "closedHat", label: "Closed Hat" },
] as const;
```

Render:

- one `masterLevel` control at the top
- one three-fader row per voice:
  - `Level`
  - `Decay`
  - `Tone`

Use `moduleSchemas[ModuleType.DrumMachine]` for min/max/step values.

**Step 3: Add focused grid tests**

Add one render test that proves the component mounts and shows a couple of expected labels:

```tsx
expect(screen.getByText("Kick")).toBeDefined();
expect(screen.getByText("Master")).toBeDefined();
```

Update `availableModules.test.ts` to verify `Drum Machine` is present in the registry.

**Step 4: Run the focused grid tests**

Run:

- `pnpm -C apps/grid test test/AudioModule/DrumMachine.test.tsx`
- `pnpm -C apps/grid test test/AudioModule/availableModules.test.ts`

Expected: PASS

**Step 5: Build packages before testing in the app**

Run: `pnpm build:packages`

Expected: PASS and `packages/engine/dist` includes the new module export.

**Step 6: Commit**

```bash
git add apps/grid/src/components/AudioModule/DrumMachine.tsx apps/grid/src/components/AudioModule/index.tsx apps/grid/src/components/AudioModule/modulesSlice.ts apps/grid/test/AudioModule/DrumMachine.test.tsx apps/grid/test/AudioModule/availableModules.test.ts
git commit -m "feat: add drum machine grid module UI"
```

### Task 6: Final verification and manual patch test

**Files:**

- Verify: `packages/engine/src/modules/DrumMachine.ts`
- Verify: `packages/engine/test/modules/DrumMachine.test.ts`
- Verify: `apps/grid/src/components/AudioModule/DrumMachine.tsx`

**Step 1: Run focused feature verification**

Run:

- `pnpm -C packages/engine test test/modules/DrumMachine.test.ts`
- `pnpm -C apps/grid test test/AudioModule/DrumMachine.test.tsx`
- `pnpm -C apps/grid test test/AudioModule/availableModules.test.ts`

Expected: PASS

**Step 2: Run package and repo-wide verification**

Run:

- `pnpm build:packages`
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`

Expected:

- `build:packages`, `tsc`, `lint`, and `format` PASS
- `pnpm test` should show the new drum-machine tests passing
- if root `pnpm test` is still RED, failures should match the existing `packages/instrument` / `packages/pi` baseline rather than introducing new drum-machine regressions

**Step 3: Do one manual integration check in grid**

Run `pnpm dev`, add `Drum Machine`, `StepSequencer`, and `Master` in the grid app, and verify:

- `StepSequencer midi out` can trigger the drum machine through `midi in`
- patching only `out` produces the full kit mix
- patching `kick out` or `closed hat out` isolates that voice
- triggering closed hat audibly chokes open hat

**Step 4: Commit**

```bash
git add packages/engine/src/modules/DrumMachine.ts packages/engine/src/modules/index.ts packages/engine/src/index.ts packages/engine/test/modules/DrumMachine.test.ts apps/grid/src/components/AudioModule/DrumMachine.tsx apps/grid/src/components/AudioModule/index.tsx apps/grid/src/components/AudioModule/modulesSlice.ts apps/grid/test/AudioModule/DrumMachine.test.tsx apps/grid/test/AudioModule/availableModules.test.ts
git commit -m "feat: add drum machine module"
```
