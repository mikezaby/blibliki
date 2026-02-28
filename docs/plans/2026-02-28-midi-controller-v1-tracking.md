# MIDI Controllers V1 Tracking (Engine + Grid)

> **For Claude/Codex:** This is a tracking document, not a speculative design doc. Keep it current as tasks land. Update status checkboxes, links, and validation notes in the same PR/branch where changes are made.

## Snapshot

- **Date:** 2026-02-28
- **Branch:** `daw-like-manual`
- **Latest commit:** `df98000` (`feat(engine): add Launch Control XL3 DAW controller sync`)
- **Primary goal:** deliver a reliable first version of hardware MIDI controller support, starting with Launch Control XL 3 DAW mode.

## What Is Already Done

### Core controller integration

- `LaunchControlXL3` controller added:
  - `packages/engine/src/core/midi/controllers/LaunchControlXL3.ts`
- Controller base callback contract aligned (`isPlayingState`) and wired from engine:
  - `packages/engine/src/core/midi/controllers/BaseController.ts`
  - `packages/engine/src/Engine.ts`
  - `packages/engine/src/core/midi/MidiDeviceManager.ts`
- Web MIDI now requests SysEx access for controller display/advanced messaging:
  - `packages/engine/src/core/midi/adapters/WebMidiAdapter.ts`

### Bidirectional mapper sync improvements

- `MidiMapper` now supports startup/page-change controller value sync from mapped module props:
  - `packages/engine/src/modules/MidiMapper.ts`
- Launch Control DAW output fuzzy-name matching broadened in mapper sync logic.
- Launch Control DAW feedback channel mapping for CC send-back implemented:
  - Encoders/faders (CC `5..36`) -> MIDI channel 16 (`0xBF`)
  - Shift/brightness special controls (CC `63`, `112`) -> channel 7 (`0xB6`)
  - Other controls -> channel 1 (`0xB0`)
- Grid patch load triggers initial MIDI controller sync:
  - `apps/grid/src/patchSlice.ts`

### Tests added

- Launch Control transport behavior:
  - `packages/engine/test/core/midi/LaunchControlXL3.test.ts`
- MidiMapper DAW feedback + output-name matching:
  - `packages/engine/test/modules/MidiMapper.test.ts`

## V1 Scope

### In scope (must have)

- Stable Launch Control XL 3 DAW mode connection lifecycle.
- Reliable two-way CC flow:
  - controller -> mapped module props
  - mapped module props -> controller feedback
- Deterministic startup sync after patch load.
- Page-change sync consistency.
- Basic transport controls from hardware (play/stop behavior already started).

### Out of scope (v1.1+)

- Full generic controller profile registry for many devices.
- Deep editor UX for controller templates/macros.
- Advanced controller scripting layer.

## Missing Work For V1

### P0: Required before v1 tag

- [ ] **Hot-plug lifecycle for controller instances**
  - Current issue: controller is instantiated at manager init only.
  - Needed: create/dispose/rebind controller when DAW ports connect/disconnect.
  - Files likely involved:
    - `packages/engine/src/core/midi/MidiDeviceManager.ts`
    - `packages/engine/src/core/midi/controllers/BaseController.ts`
    - `packages/engine/src/core/midi/controllers/LaunchControlXL3.ts`

- [ ] **Continuous reverse sync when mapped props change**
  - Current state: sync occurs on startup and page switches.
  - Needed: push updated mapped values to controller when module props change from UI/automation/load.
  - Files likely involved:
    - `packages/engine/src/modules/MidiMapper.ts`
    - `packages/engine/src/Engine.ts`
    - `apps/grid/src/components/AudioModule/modulesSlice.ts` (if event trigger needed at app boundary)

- [ ] **Controller lifecycle cleanup**
  - Current issue: animation/interval timers exist but no explicit dispose path.
  - Needed: ensure timers/listeners are cleared on disconnect/engine dispose.
  - Files likely involved:
    - `packages/engine/src/core/midi/controllers/BaseController.ts`
    - `packages/engine/src/core/midi/controllers/LaunchControlXL3.ts`
    - `packages/engine/src/core/midi/MidiDeviceManager.ts`

### P1: Strongly recommended for v1 robustness

- [ ] **Expand transport/control command coverage**
  - Implement and verify intended button map for DAW mode navigation/page controls.
  - Add tests for each supported command path.

- [ ] **Improve controller matching confidence + telemetry**
  - Normalize expected DAW port names for browser/node variation.
  - Add lightweight debug logs behind a flag for match quality and connection transitions.

### P2: Nice-to-have before public docs

- [ ] **Controller behavior matrix doc**
  - Human-readable table of supported controls, MIDI channels, and expected behavior.
- [ ] **Known limitations section in README/docs**
  - Explicitly call out unsupported controls and fallback behavior.

## Acceptance Criteria For V1

- [ ] Controller can be connected after app start and still becomes fully operational.
- [ ] Controller disconnect does not leave stale listeners/timers or throw runtime errors.
- [ ] On patch load, mapped values are reflected on Launch Control XL 3 controls without manual interaction.
- [ ] Changing a mapped value in UI updates controller feedback within one render/update cycle.
- [ ] Incoming CC updates mapped module props and persists mapping value state.
- [ ] `pnpm tsc`, `pnpm lint`, `pnpm test`, `pnpm format` pass on the branch.

## Work Log

### 2026-02-28

- Cleaned branch history into one commit: `df98000`.
- Added Launch Control XL 3 DAW controller class and tests.
- Added mapper startup sync + DAW channel-aware CC feedback.
- Added patch-load-triggered controller sync.

## Validation Commands

```bash
pnpm tsc
pnpm lint
pnpm test
pnpm format
```

## Notes

- Initial full test run on 2026-02-28 showed two intermittent engine audio test failures (`Filter.test.ts`, `Scale.test.ts`) and passed on rerun. Treat as known flake risk to monitor while landing P0 work.
