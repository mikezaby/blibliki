# Pi Display OSC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current terminal-only Pi display path with two independent services, `@blibliki/pi` and `apps/pi-display`, that communicate over a versioned OSC protocol and remain easy to debug on both Mac and Raspberry Pi.

**Architecture:** Keep `InstrumentDisplayState` as the internal semantic state in `packages/instrument` and `packages/pi`. Add a small Pi-side adapter that converts that state into a structured `DisplayProtocolState`, then map that structured state onto fixed OSC addresses over UDP on `localhost`. The display app listens independently, requests a full snapshot when it starts, applies incoming revisions into a local store, and renders the resulting state in Slint.

**Tech Stack:** TypeScript, Node.js UDP sockets, OSC message encoding/decoding, Vitest, Slint TypeScript, pnpm workspaces

## Preflight Notes

- In this fresh worktree, root `pnpm test` currently fails before any feature work because `packages/transport` cannot resolve `@blibliki/utils` until the workspace packages have been built at least once.
- Before the first focused test run, execute `pnpm build:packages`.
- Treat `full` snapshots as the canonical state transfer in `v1`. Section messages (`header` and `band/*`) should be supported by the protocol and the display store, but the first Pi publisher can still send `full` on every change until the integration is stable.

## Default Runtime Configuration

Use these defaults unless implementation work discovers a conflict:

- Pi host to publish to: `127.0.0.1`
- Display listen port: `41234`
- Pi control listen port: `41235`
- OSC namespace root: `/blibliki/v1`

Environment variables to implement and document:

- `BLIBLIKI_PI_DISPLAY_MODE=terminal|osc`
- `BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1`
- `BLIBLIKI_PI_DISPLAY_PORT=41234`
- `BLIBLIKI_PI_CONTROL_PORT=41235`
- `BLIBLIKI_PI_DISPLAY_DEBUG=0|1`
- `BLIBLIKI_DISPLAY_PORT=41234`
- `BLIBLIKI_DISPLAY_PI_HOST=127.0.0.1`
- `BLIBLIKI_DISPLAY_PI_PORT=41235`
- `BLIBLIKI_DISPLAY_DEBUG=0|1`

### Task 1: Create the Shared Display Protocol Package

**Files:**
- Create: `packages/display-protocol/package.json`
- Create: `packages/display-protocol/tsconfig.json`
- Create: `packages/display-protocol/tsup.config.ts`
- Create: `packages/display-protocol/src/index.ts`
- Create: `packages/display-protocol/src/state.ts`
- Create: `packages/display-protocol/src/network.ts`
- Test: `packages/display-protocol/test/state.test.ts`

**Step 1: Write the failing protocol-state test**

Create `packages/display-protocol/test/state.test.ts` with a fixture-oriented test that proves the structured state contract is renderer-ready:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_OSC_PORT,
  DEFAULT_PI_OSC_PORT,
  type DisplayProtocolState,
} from "@/index";

describe("DisplayProtocolState", () => {
  it("keeps header, three bands, and renderer-ready value metadata together", () => {
    const state: DisplayProtocolState = {
      revision: 7,
      screen: {
        orientation: "landscape",
        targetClass: "standard",
      },
      header: {
        left: "Blibliki Pi",
        center: "track-2",
        right: "Page 2: FILTER / MOD",
        transport: "PLAY",
        mode: "PERF",
      },
      bands: [
        {
          key: "global",
          title: "GLOBAL",
          cells: [
            {
              key: "tempo",
              label: "BPM",
              inactive: false,
              empty: false,
              value: {
                kind: "number",
                raw: 137,
                formatted: "137 BPM",
                visualNormalized: 0.75,
                visualScale: "linear",
              },
            },
          ],
        },
      ],
    };

    expect(state.bands[0]?.cells[0]?.value).toEqual(
      expect.objectContaining({
        raw: 137,
        formatted: "137 BPM",
        visualNormalized: 0.75,
      }),
    );
    expect(DEFAULT_DISPLAY_OSC_PORT).not.toBe(DEFAULT_PI_OSC_PORT);
  });
});
```

**Step 2: Run the new package test to verify RED**

Run: `pnpm -C packages/display-protocol test test/state.test.ts`

Expected: FAIL because the package and exported types do not exist yet.

**Step 3: Add the minimal package scaffold and state model**

Create the package files and export:

- `DisplayProtocolState`
- `DisplayHeaderState`
- `DisplayBandState`
- `DisplayCellState`
- `DisplayCellValue`
- `DEFAULT_DISPLAY_OSC_PORT`
- `DEFAULT_PI_OSC_PORT`

Keep the state model structured and transport-agnostic. Do not put OSC byte-level concerns into `state.ts`.

**Step 4: Run the package test to verify GREEN**

Run: `pnpm -C packages/display-protocol test test/state.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/display-protocol
git commit -m "feat: add shared display protocol package"
```

### Task 2: Add the OSC Address and Codec Layer

**Files:**
- Create: `packages/display-protocol/src/addresses.ts`
- Create: `packages/display-protocol/src/codec.ts`
- Modify: `packages/display-protocol/src/index.ts`
- Test: `packages/display-protocol/test/codec.test.ts`

**Step 1: Write the failing codec round-trip tests**

Create `packages/display-protocol/test/codec.test.ts` with tests for the fixed address set:

```ts
import { describe, expect, it } from "vitest";
import {
  decodeDisplayOscPacket,
  encodeDisplayOscMessage,
  type DisplayOscMessage,
} from "@/index";

describe("display OSC codec", () => {
  it("round-trips a full snapshot message", () => {
    const message: DisplayOscMessage = {
      type: "display.full",
      state: {
        revision: 9,
        screen: { orientation: "landscape", targetClass: "standard" },
        header: {
          left: "Debug",
          center: "track-1",
          right: "Page 1: SOURCE / AMP",
          transport: "STOP",
          mode: "PERF",
        },
        bands: [],
      },
    };

    expect(decodeDisplayOscPacket(encodeDisplayOscMessage(message))).toEqual(
      message,
    );
  });

  it("round-trips a request_full_state control message", () => {
    expect(
      decodeDisplayOscPacket(
        encodeDisplayOscMessage({ type: "display.request_full_state" }),
      ),
    ).toEqual({ type: "display.request_full_state" });
  });
});
```

**Step 2: Run the focused codec test to verify RED**

Run: `pnpm -C packages/display-protocol test test/codec.test.ts`

Expected: FAIL because the address constants and codec helpers do not exist.

**Step 3: Implement the fixed OSC message set**

Add constants for:

- `/blibliki/v1/display/full`
- `/blibliki/v1/display/header`
- `/blibliki/v1/display/band/global`
- `/blibliki/v1/display/band/upper`
- `/blibliki/v1/display/band/lower`
- `/blibliki/v1/display/request_full_state`

Then implement:

- `type DisplayOscMessage`
- `encodeDisplayOscMessage(message)`
- `decodeDisplayOscPacket(packet)`

Keep the payload order fixed per address. Do not introduce ad hoc patch objects.

**Step 4: Extend the codec test with one section update**

Add a second state-bearing message, for example:

```ts
{
  type: "display.band",
  bandKey: "global",
  revision: 10,
  band: {
    key: "global",
    title: "GLOBAL",
    cells: [],
  },
}
```

Then verify it also round-trips cleanly.

**Step 5: Run the package tests to verify GREEN**

Run:

- `pnpm -C packages/display-protocol test test/state.test.ts`
- `pnpm -C packages/display-protocol test test/codec.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add packages/display-protocol
git commit -m "feat: add osc display protocol codec"
```

### Task 3: Publish OSC Display State from `@blibliki/pi`

**Files:**
- Modify: `packages/pi/package.json`
- Create: `packages/pi/src/displayProtocol.ts`
- Create: `packages/pi/src/displayOutput.ts`
- Create: `packages/pi/src/oscDisplayPublisher.ts`
- Modify: `packages/pi/src/index.ts`
- Modify: `packages/pi/src/defaultInstrument.ts`
- Modify: `packages/pi/src/cliMain.ts`
- Test: `packages/pi/test/displayProtocol.test.ts`
- Test: `packages/pi/test/oscDisplayPublisher.test.ts`
- Modify: `packages/pi/test/startConfiguredDevice.test.ts`
- Modify: `packages/pi/test/defaultInstrumentSession.test.ts`
- Modify: `packages/pi/test/cliMain.test.ts`

**Step 1: Write the failing Pi-side adapter test**

Create `packages/pi/test/displayProtocol.test.ts` to prove the adapter turns `InstrumentDisplayState` into renderer-ready protocol state:

```ts
import { describe, expect, it } from "vitest";
import { createLiveInstrumentDisplayState } from "@/liveDisplayState";
import { instrumentDisplayStateToProtocol } from "@/displayProtocol";

describe("instrumentDisplayStateToProtocol", () => {
  it("keeps formatted values and derives normalized visuals", () => {
    const displayState = createLiveInstrumentDisplayState(/* seeded fixture */);
    const protocol = instrumentDisplayStateToProtocol(displayState);

    expect(protocol.header.center).toBe("track-1");
    expect(protocol.bands[0]?.cells[0]?.value).toEqual(
      expect.objectContaining({
        formatted: expect.stringContaining("BPM"),
        visualNormalized: expect.any(Number),
      }),
    );
  });
});
```

**Step 2: Write the failing OSC publisher tests**

Create `packages/pi/test/oscDisplayPublisher.test.ts` with two tests:

- publisher sends a `display.full` message to the configured display port
- publisher responds to `display.request_full_state` with the latest full snapshot

Use a fake UDP transport wrapper rather than real sockets in the unit test.

**Step 3: Run the focused Pi tests to verify RED**

Run:

- `pnpm build:packages`
- `pnpm -C packages/pi test test/displayProtocol.test.ts`
- `pnpm -C packages/pi test test/oscDisplayPublisher.test.ts`

Expected: FAIL because the adapter and publisher do not exist.

**Step 4: Implement the adapter and the independent display output**

Add:

- `instrumentDisplayStateToProtocol(displayState)`
- `createOscDisplayPublisher(...)`
- `createConfiguredDisplayOutput(...)`

`startConfiguredDevice()` and `startDefaultInstrument()` should stop assuming a child display or a terminal renderer. They should instead choose one output:

- `terminal` for local fallback
- `osc` for the independent display service

Use env vars for `v1`:

- `BLIBLIKI_PI_DISPLAY_MODE=terminal|osc`
- `BLIBLIKI_PI_DISPLAY_HOST`
- `BLIBLIKI_PI_DISPLAY_PORT`
- `BLIBLIKI_PI_CONTROL_PORT`
- `BLIBLIKI_PI_DISPLAY_DEBUG`

Do not spawn `apps/pi-display` from `packages/pi`.

**Step 5: Update the focused Pi tests**

Make `startConfiguredDevice.test.ts` and `defaultInstrumentSession.test.ts` assert that both runtime entry points can publish display state without needing an in-process child display.

Add one CLI help assertion to `cliMain.test.ts` so the OSC display env vars are discoverable.

**Step 6: Run the focused Pi tests to verify GREEN**

Run:

- `pnpm -C packages/pi test test/displayProtocol.test.ts`
- `pnpm -C packages/pi test test/oscDisplayPublisher.test.ts`
- `pnpm -C packages/pi test test/startConfiguredDevice.test.ts`
- `pnpm -C packages/pi test test/defaultInstrumentSession.test.ts`
- `pnpm -C packages/pi test test/cliMain.test.ts`

Expected: PASS

**Step 7: Commit**

```bash
git add packages/pi
git commit -m "feat(pi): publish display state over osc"
```

### Task 4: Create the Independent `apps/pi-display` OSC Listener

**Files:**
- Create: `apps/pi-display/package.json`
- Create: `apps/pi-display/tsconfig.json`
- Create: `apps/pi-display/ui/dashboard.slint`
- Create: `apps/pi-display/src/main.ts`
- Create: `apps/pi-display/src/config.ts`
- Create: `apps/pi-display/src/oscListener.ts`
- Create: `apps/pi-display/src/displayStore.ts`
- Create: `apps/pi-display/src/viewModel.ts`
- Create: `apps/pi-display/src/logger.ts`
- Test: `apps/pi-display/test/displayStore.test.ts`
- Test: `apps/pi-display/test/viewModel.test.ts`

**Step 1: Write the failing display-store tests**

Create `apps/pi-display/test/displayStore.test.ts` to prove the display can:

- replace its state from `display.full`
- apply a newer `display.header`
- ignore an older stale revision

Example:

```ts
import { describe, expect, it } from "vitest";
import { createDisplayStore } from "@/displayStore";

describe("display store", () => {
  it("applies full snapshots and ignores stale partial updates", () => {
    const store = createDisplayStore();

    store.apply({ type: "display.full", state: fullState(4) });
    store.apply({
      type: "display.header",
      revision: 3,
      header: staleHeader,
    });

    expect(store.getState().revision).toBe(4);
    expect(store.getState().header.center).toBe("track-1");
  });
});
```

**Step 2: Write the failing view-model test**

Create `apps/pi-display/test/viewModel.test.ts` to prove the Slint-facing props come from the structured state instead of transport-specific details.

**Step 3: Run the focused app tests to verify RED**

Run:

- `pnpm -C apps/pi-display test test/displayStore.test.ts`
- `pnpm -C apps/pi-display test test/viewModel.test.ts`

Expected: FAIL because the app package and store do not exist.

**Step 4: Implement the independent listener app**

Create the Slint app with this startup flow:

1. Bind a UDP listener on the display port
2. Immediately send `display.request_full_state` to the Pi control port
3. Apply incoming protocol messages into `displayStore`
4. Map structured state into simple Slint props in `viewModel.ts`
5. Render the existing dashboard shape in `dashboard.slint`

Keep `apps/pi-display` independent from `packages/pi`. It should import only `@blibliki/display-protocol`.

**Step 5: Add debug logging hooks**

In `logger.ts`, add a debug-level summary such as:

```ts
display.full revision=12 track=track-2 right="Page 2: FILTER / MOD"
```

Enable it behind an env flag so the app stays quiet by default.

Use env vars for `v1`:

- `BLIBLIKI_DISPLAY_PORT`
- `BLIBLIKI_DISPLAY_PI_HOST`
- `BLIBLIKI_DISPLAY_PI_PORT`
- `BLIBLIKI_DISPLAY_DEBUG`

**Step 6: Run the focused app tests to verify GREEN**

Run:

- `pnpm -C apps/pi-display test test/displayStore.test.ts`
- `pnpm -C apps/pi-display test test/viewModel.test.ts`

Expected: PASS

**Step 7: Commit**

```bash
git add apps/pi-display
git commit -m "feat(display): add osc-driven slint display app"
```

### Task 5: Add OSC Debug and Replay Tools

**Files:**
- Modify: `packages/display-protocol/package.json`
- Create: `packages/display-protocol/src/fixtures.ts`
- Create: `packages/display-protocol/src/bin/sendFullFixture.ts`
- Create: `packages/display-protocol/src/bin/sendBandFixture.ts`
- Create: `packages/display-protocol/src/bin/dumpOsc.ts`
- Modify: `packages/display-protocol/src/index.ts`
- Test: `packages/display-protocol/test/fixtures.test.ts`

**Step 1: Write the failing fixture test**

Create `packages/display-protocol/test/fixtures.test.ts` that proves:

- `createDebugFullState()` returns a valid `DisplayProtocolState`
- the fixture can be encoded and decoded through the OSC codec without losing revision or header text

**Step 2: Run the focused fixture test to verify RED**

Run: `pnpm -C packages/display-protocol test test/fixtures.test.ts`

Expected: FAIL because the fixture helpers and scripts do not exist.

**Step 3: Implement the developer tools**

Add package scripts such as:

- `pnpm -C packages/display-protocol debug:dump`
- `pnpm -C packages/display-protocol debug:send-full`
- `pnpm -C packages/display-protocol debug:send-band`

The tools should make these checks trivial:

- “Is the Pi publishing anything?”
- “Will the display redraw if I send a known-good snapshot?”
- “Can I replay one global-band update without starting the engine?”

**Step 4: Run the protocol tests to verify GREEN**

Run:

- `pnpm -C packages/display-protocol test test/state.test.ts`
- `pnpm -C packages/display-protocol test test/codec.test.ts`
- `pnpm -C packages/display-protocol test test/fixtures.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/display-protocol
git commit -m "feat(protocol): add osc debug and replay tools"
```

### Task 6: End-to-End Verification and Documentation

**Files:**
- Modify: `docs/plans/2026-03-30-pi-lcd-dashboard-session-decisions.md`
- Modify: `docs/plans/2026-04-01-pi-display-osc-implementation-plan.md`

**Step 1: Add a short follow-up note to the LCD session decisions**

Append a short “Implementation Update” section that records the new architectural decision:

- terminal mock remains useful
- real display is now an independent OSC-driven service
- the child-process stdio approach is no longer the target architecture

**Step 2: Write down the manual verification commands**

Add exact commands for:

- desktop display listener on Mac
- Pi publisher in OSC mode
- debug fixture sender
- debug dump listener

**Step 3: Run repository verification**

Run:

- `pnpm build:packages`
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`
- `pnpm format`
- `pnpm tsc`
- `pnpm lint`
- `pnpm test`

Expected: PASS, or document any pre-existing failures that remain outside this slice.

**Step 4: Commit**

```bash
git add docs/plans
git commit -m "docs: capture osc display implementation path"
```

## Concrete Usage and Debugging Guide

This guide describes the intended workflow after Tasks 1 through 5 are implemented. It is the target operator workflow, not a claim that these commands work on the current branch yet.

### One-time setup

From the OSC worktree:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
pnpm install
pnpm build:packages
```

### Start the display on a Mac

Windowed desktop validation:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_DISPLAY_PORT=41234 \
BLIBLIKI_DISPLAY_PI_HOST=127.0.0.1 \
BLIBLIKI_DISPLAY_PI_PORT=41235 \
BLIBLIKI_DISPLAY_DEBUG=1 \
SLINT_BACKEND=winit \
pnpm -C apps/pi-display start
```

Expected behavior:

- the window opens
- the display sends `request_full_state` to the Pi control port
- the terminal logs incoming message summaries when debug is enabled

### Start the display on Raspberry Pi without X

```bash
cd /Users/mikezaby/projects/blibliki/blibliki
BLIBLIKI_DISPLAY_PORT=41234 \
BLIBLIKI_DISPLAY_PI_HOST=127.0.0.1 \
BLIBLIKI_DISPLAY_PI_PORT=41235 \
BLIBLIKI_DISPLAY_DEBUG=1 \
SLINT_BACKEND=linuxkms-software \
pnpm -C apps/pi-display start
```

If `linuxkms-software` is not stable enough, validate a fallback backend explicitly and record the result in the implementation notes.

### Start the Pi runtime in OSC mode

Firestore-driven runtime:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki
BLIBLIKI_PI_DISPLAY_MODE=osc \
BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1 \
BLIBLIKI_PI_DISPLAY_PORT=41234 \
BLIBLIKI_PI_CONTROL_PORT=41235 \
BLIBLIKI_PI_DISPLAY_DEBUG=1 \
pnpm -C packages/pi start
```

Default instrument runtime:

```bash
cd /Users/mikezaby/projects/blibliki/blibliki
BLIBLIKI_PI_DISPLAY_MODE=osc \
BLIBLIKI_PI_DISPLAY_HOST=127.0.0.1 \
BLIBLIKI_PI_DISPLAY_PORT=41234 \
BLIBLIKI_PI_CONTROL_PORT=41235 \
BLIBLIKI_PI_DISPLAY_DEBUG=1 \
pnpm -C packages/pi start-default
```

If no separate `start-default` script exists, implement one or document the exact alternative entry point when Task 3 is done.

### Send a known-good full snapshot without the Pi engine

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_DISPLAY_PORT=41234 \
pnpm -C packages/display-protocol debug:send-full
```

Use this first when the display window opens but does not react. If this command updates the display, the problem is upstream in `packages/pi`.

### Send a section update only

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_DISPLAY_PORT=41234 \
pnpm -C packages/display-protocol debug:send-band --band global
```

Use this to confirm that section-level partials replace only one band and do not force a full resync.

### Dump all incoming OSC messages

```bash
cd /Users/mikezaby/projects/blibliki/blibliki/.worktrees/pi-display-osc
BLIBLIKI_DISPLAY_PORT=41234 \
pnpm -C packages/display-protocol debug:dump
```

This should print the address, revision, and a compact summary for every packet received on the display port.

### Minimal debug sequence

When debugging the full path, use this order:

1. Start `debug:dump` and verify packets are reaching the display port.
2. Start `apps/pi-display` with `BLIBLIKI_DISPLAY_DEBUG=1` and verify it logs parsed message summaries.
3. Run `debug:send-full` and confirm the display updates.
4. Start `packages/pi` in `osc` mode and confirm live track, page, or BPM changes produce newer revisions.
5. If the display stops matching the engine, trigger `request_full_state` and verify the Pi answers with a fresh `display.full`.

### Useful failure interpretations

- `debug:dump` sees nothing: publisher host, port, or socket binding is wrong.
- `debug:dump` sees packets but `pi-display` does not update: listener decode or display-store logic is wrong.
- `debug:send-full` updates the display but live Pi changes do not: the bug is in `packages/pi` publishing or adapter code.
- live updates work on Mac with `winit` but not on Pi with `linuxkms`: the problem is likely backend/runtime, not OSC.
