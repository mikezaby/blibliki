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

const createContext = () => {
  try {
    return new Context();
  } catch (error) {
    // In some CI/local environments, probing the default CoreAudio output fails.
    // Falling back to a "none" sink keeps real-time processing without hardware output.
    if (
      error instanceof Error &&
      (error.message.includes("querying device output config") ||
        error.message.includes("default_output_config"))
    ) {
      return new Context(new AudioContext({ sinkId: "none" } as any));
    }

    throw error;
  }
};

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
