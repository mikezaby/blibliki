import type { InstrumentCompileResult } from "@blibliki/instrument";
import assert from "node:assert/strict";
import test from "node:test";
import { createInstrumentRuntime } from "../src/index.ts";

test("installs the pi controller matcher before creating the engine for instrument boot", async () => {
  const events: string[] = [];
  const createdModules: unknown[] = [];
  const createdRoutes: unknown[] = [];

  class FakeContext {}

  class FakeEngine {
    id = "engine-test";
    bpm = 0;
    timeSignature: unknown = null;

    constructor(_context: FakeContext) {
      events.push("engine");
    }

    async initialize() {
      events.push("initialize");
    }

    addModule(module: unknown) {
      createdModules.push(module);
    }

    addRoute(route: unknown) {
      createdRoutes.push(route);
    }
  }

  class FakeSession {
    constructor(_engine: FakeEngine, _compiled: InstrumentCompileResult) {
      events.push("session");
    }

    start() {
      events.push("start");
    }
  }

  const compiled = {
    document: {
      version: "0.1.0",
      name: "Test Instrument",
      templateId: "pi-8-track-v1",
      hardwareProfileId: "launch-control-xl3-v1",
      globalBlock: { slots: [] },
      tracks: [],
    },
    engine: {
      bpm: 123,
      timeSignature: { numerator: 4, denominator: 4 },
      modules: [{ id: "module-1" }],
      routes: [{ id: "route-1" }],
    },
    bindings: {},
    tracks: [],
  } as unknown as InstrumentCompileResult;

  const { engine } = await createInstrumentRuntime(compiled, {
    installMatcher: () => {
      events.push("matcher");
    },
    ContextClass: FakeContext as never,
    EngineClass: FakeEngine as never,
    SessionClass: FakeSession as never,
  });

  assert.deepEqual(events, [
    "matcher",
    "engine",
    "session",
    "initialize",
    "start",
  ]);
  assert.equal(engine.bpm, 123);
  assert.deepEqual(engine.timeSignature, { numerator: 4, denominator: 4 });
  assert.deepEqual(createdModules, [{ id: "module-1" }]);
  assert.deepEqual(createdRoutes, [{ id: "route-1" }]);
});
