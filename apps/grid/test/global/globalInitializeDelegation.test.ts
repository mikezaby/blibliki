// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const engineConstructor = vi.fn();
const initializeFirebaseMock = vi.fn();
const isFirebaseInitializedMock = vi.fn(() => false);

vi.mock("@/patchSlice", () => ({
  loadById: vi.fn(() => ({ type: "patch/loadById" })),
}));

vi.mock("@blibliki/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@blibliki/engine")>();

  class Engine {
    id = "engine-1";
    bpm = 120;
    transport = { state: "stopped" as const };

    constructor(_context: unknown) {
      engineConstructor();
    }

    async initialize(): Promise<void> {}

    onPropsUpdate(): void {}

    static get current() {
      return {
        start: async () => undefined,
        stop: () => undefined,
        dispose: () => undefined,
        bpm: 120,
      };
    }
  }

  return {
    ...actual,
    Engine,
    TransportState: { playing: "playing" },
  };
});

vi.mock("@blibliki/models", () => ({
  initializeFirebase: initializeFirebaseMock,
  isFirebaseInitialized: isFirebaseInitializedMock,
}));

vi.mock("@blibliki/utils", () => ({
  Context: class {
    constructor(_audioContext: unknown) {}
  },
  requestAnimationFrame: (_callback: () => void) => 1,
}));

vi.mock("@blibliki/utils/web-audio-api", () => ({
  AudioContext: class {
    constructor(_context: unknown) {}
  },
}));

describe("globalSlice.initialize", () => {
  it("should only initialize firebase and not dispatch engine bootstrap actions", async () => {
    const { initialize } = await import("../../src/globalSlice");
    initialize();

    expect(isFirebaseInitializedMock).toHaveBeenCalledTimes(1);
    expect(initializeFirebaseMock).toHaveBeenCalledTimes(1);
    expect(engineConstructor).not.toHaveBeenCalled();
  });
});
