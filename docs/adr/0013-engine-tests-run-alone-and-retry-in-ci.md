# 13. Engine tests run alone, retry in CI, and do not wait on a stuck close

Date: 2026-09-20. Status: accepted.

## Context

CI failed 5 times in 40 runs, always in `packages/engine`, each time on a
different test: two 10 s hook timeouts, a 3 s wait that never saw its
signal, an envelope value read too late, and a gain read too early. Six
earlier commits each patched the test that had failed. The next failure
came from another test.

The engine suite renders in real time through `node-web-audio-api`. A
test asserts from the JS thread on state that a free-running render
thread owns, so every immediate read and every wall-clock deadline has a
small chance of losing a race. Measured on the library directly: a param
written twice and read back at once returns the older value 1 time in
4000 on an idle machine and 10 in 4000 with every core busy. The value is
right 10 ms later. The render thread writes its computed value back after
each quantum, and it can do so between the two writes.

`pnpm test` started every workspace's vitest at once: eleven processes on
a 4 vCPU runner. Four of the five failures landed while the grid suite
was still running, and the same flakes showed up locally under `pnpm
test`.

The hook timeouts are a third thing, and load has no part in them.
`node-web-audio-api` deadlocks in `close()` when the context is closed
within about 10 ms of creating a worklet processor. Closing right after
adding a Wavetable hung 22 times in 400; with no module, a Gain or an
Envelope it hung 0 times in 80 each. During a hang the audio clock moves
3 ms in 3 s and the process uses 0.05 s of CPU, so nothing of ours is
spinning. `Wavetable.test.ts` alone failed 2 runs in 15 this way, with
the engine suite running by itself.

## Decision

The engine suite never shares a machine with the other suites. `pnpm
test` runs `test:rest` (everything else, in parallel) and then
`test:engine`. CI runs the two as separate jobs, so the engine has a
runner to itself and the wall-clock time stays the same.

In CI the engine suite retries a failed test twice. Vitest re-runs
`beforeEach` and `afterEach` inside a retry, so each attempt gets a new
context and engine, which also covers a teardown that hangs. Local runs
do not retry, so a flake is still seen by the person who can fix it.

Teardown in `test/testSetup.ts` waits 1 s for `close()` and then moves
on, leaking that context. A healthy close takes under 25 ms even with
every core busy. With this `Wavetable.test.ts` passed 20 runs in 20, three
of them a second or two slower.

## Alternatives rejected

- Patching each test as it fails. Done six times. The cause is shared by
  every test, so the failures move rather than stop.
- Rendering tests through `OfflineAudioContext`. This is the only option
  that removes the race instead of bounding it. It means rewriting 39
  files that wait on a running clock, and the transport tests need real
  time. Worth doing file by file if retries start showing up often.
- Retrying everywhere. It would hide a new intermittent bug from the
  developer who introduced it.
- Longer timeouts. They do nothing for the stale read, and a deadlocked
  close never returns however long the hook waits.
- A pause before every close, to step out of the window where the
  deadlock happens. It costs 25 ms on each of 271 tests, and the window
  is wider on a slower machine.

## Consequences

A test that loses the race three times in a row still fails the build.
At the measured loaded rate that is about 1 in 60 million per read.

A real bug that fails only sometimes can now pass CI on a retry. Vitest
prints the retry count next to the test, so it stays visible in the log.

The close deadlock is still there, only no longer fatal to a test. It
is recorded in `docs/findings.md` for an upstream report. It was measured
on macOS. The two hook timeouts on the Linux runner fit it (both tests
create a worklet module and end at once) but were not reproduced there.
