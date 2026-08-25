import { Context } from "@blibliki/utils";
import { AudioContext } from "@blibliki/utils/web-audio-api";
import { afterEach, beforeEach, vi } from "vitest";
import { Engine } from "@/Engine";
import { setMidiAdapterFactory } from "@/core/midi/adapters";
import { createWebMidiAdapter } from "@/core/midi/adapters/createMidiAdapter.web";
import { setProcessorsLoader } from "@/processors";
import { loadWebProcessors } from "@/processors/loadProcessors.web";

// Tests run against source (not the built package entry), so wire the platform
// implementations the same way index.browser does.
setProcessorsLoader(loadWebProcessors);
setMidiAdapterFactory(createWebMidiAdapter);

declare module "vitest" {
  export interface TestContext {
    context: Context;
    engine: Engine;
  }
}

// Nothing here listens to the output, and a real device sink costs an open and
// a close per test (~120ms), whose teardown occasionally hangs in afterEach.
// The "none" sink still renders in real time, so audio-time waits are unaffected.
const createContext = () =>
  new Context(new AudioContext({ sinkId: "none" } as any));

beforeEach(async (ctx) => {
  ctx.context = createContext();
  ctx.engine = new Engine(ctx.context);

  // Avoid native MIDI backend initialization in shared setup.
  vi.spyOn(ctx.engine.midiDeviceManager, "initialize").mockResolvedValue();

  await ctx.engine.initialize();
  await ctx.engine.resume();
});

afterEach(async (ctx) => {
  ctx.engine?.dispose();
  await ctx.context?.close();
});
