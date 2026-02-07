import { Context } from "@blibliki/utils";
import { AudioContext } from "@blibliki/utils/web-audio-api";
import { afterEach, beforeEach, vi } from "vitest";
import { Engine } from "@/Engine";

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
      error.message.includes("querying device output config")
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
  await ctx.context?.close();
  ctx.engine?.dispose();
});
