import { afterEach, describe, expect, it, vi } from "vitest";

type MockAudioContextOptions = AudioContextOptions | undefined;

const createMockAudioContextClass = (
  onConstruct: (options: MockAudioContextOptions) => void,
) =>
  class MockAudioContext {
    audioWorklet = {
      addModule: vi.fn(),
    };
    currentTime = 0;
    destination = {};

    constructor(options?: AudioContextOptions) {
      onConstruct(options);
    }

    close = vi.fn(async () => undefined);
    resume = vi.fn(async () => undefined);
  };

class MockOfflineAudioContext {
  audioWorklet = {
    addModule: vi.fn(),
  };
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => undefined);
}

class MockAudioWorkletNode {}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Context", () => {
  it("creates a browser audio context with the provided latency hint", async () => {
    let receivedOptions: MockAudioContextOptions;
    const MockAudioContext = createMockAudioContextClass((options) => {
      receivedOptions = options;
    });

    vi.stubGlobal("window", {
      AudioContext: MockAudioContext,
      OfflineAudioContext: MockOfflineAudioContext,
      AudioWorkletNode: MockAudioWorkletNode,
    });

    const { Context } = await import("../src/Context.browser.ts");
    const context = new Context({ latencyHint: "interactive" });

    expect(receivedOptions).toEqual({ latencyHint: "interactive" });
    expect(context.audioContext).toBeInstanceOf(MockAudioContext);
  });

  it("creates a node audio context with the provided latency hint", async () => {
    let receivedOptions: MockAudioContextOptions;
    const MockAudioContext = createMockAudioContextClass((options) => {
      receivedOptions = options;
    });

    vi.doMock("node-web-audio-api", () => ({
      AudioContext: MockAudioContext,
      OfflineAudioContext: MockOfflineAudioContext,
      AudioWorkletNode: MockAudioWorkletNode,
    }));

    const { Context } = await import("../src/Context.node.ts");
    const context = new Context({ latencyHint: "playback" });

    expect(receivedOptions).toEqual({ latencyHint: "playback" });
    expect(context.audioContext).toBeInstanceOf(MockAudioContext);
  });

  it("reuses a provided node audio context instance", async () => {
    let constructorCalls = 0;
    const MockAudioContext = createMockAudioContextClass(() => {
      constructorCalls += 1;
    });

    vi.doMock("node-web-audio-api", () => ({
      AudioContext: MockAudioContext,
      OfflineAudioContext: MockOfflineAudioContext,
      AudioWorkletNode: MockAudioWorkletNode,
    }));

    const { Context } = await import("../src/Context.node.ts");
    const existingContext = new MockAudioContext();

    constructorCalls = 0;

    const context = new Context(existingContext as never);

    expect(context.audioContext).toBe(existingContext);
    expect(constructorCalls).toBe(0);
  });
});
