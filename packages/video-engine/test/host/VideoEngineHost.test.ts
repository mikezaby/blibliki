import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoEngineHost } from "@/host/VideoEngineHost";
import { HostMessage, WorkerMessage } from "@/protocol";

type FakeWorker = Worker & { postMessage: ReturnType<typeof vi.fn> };

function setup(readSpectrum?: () => { id: string; bins: Float32Array }[]) {
  let pending: FrameRequestCallback | null = null;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    pending = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pending = null;
  });

  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
  } as unknown as FakeWorker;

  const host = new VideoEngineHost({
    patchSource: { serialize: () => ({ modules: [] }), onPropsUpdate: vi.fn() },
    createWorker: () => worker,
    readSpectrum,
  });

  const canvas = {
    width: 160,
    height: 90,
    transferControlToOffscreen: () => ({}) as OffscreenCanvas,
  } as unknown as HTMLCanvasElement;

  const tick = () => {
    const cb = pending;
    pending = null;
    cb?.(0);
  };
  const sent = <T extends HostMessage["type"]>(type: T) =>
    worker.postMessage.mock.calls
      .map(([message]) => message as HostMessage)
      .filter(
        (message): message is Extract<HostMessage, { type: T }> =>
          message.type === type,
      );
  const reply = (message: WorkerMessage) => {
    worker.onmessage?.({ data: message } as MessageEvent<WorkerMessage>);
  };

  return {
    host,
    worker,
    canvas,
    tick,
    sent,
    reply,
    hasPending: () => !!pending,
  };
}

describe("VideoEngineHost spectrum tick", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not schedule a frame loop without readSpectrum", () => {
    const { hasPending } = setup();

    expect(hasPending()).toBe(false);
  });

  it("sends nothing while no view is attached", () => {
    const bins = new Float32Array([-30, -40]);
    const { tick, sent } = setup(() => [{ id: "m1", bins }]);

    tick();

    expect(sent("spectrum")).toEqual([]);
  });

  it("keeps one buffer per module in flight", () => {
    const bins = new Float32Array([-30, -40]);
    const { host, canvas, tick, sent, reply } = setup(() => [
      { id: "m1", bins },
    ]);

    host.attachView("preview", canvas, 15);
    tick();
    expect(sent("spectrum")).toEqual([
      { type: "spectrum", moduleId: "m1", bins },
    ]);
    expect(sent("spectrum")[0]?.bins).not.toBe(bins);

    tick();
    expect(sent("spectrum")).toHaveLength(1);

    reply({
      type: "spectrumBuffer",
      moduleId: "m1",
      bins: new Float32Array(2),
    });
    tick();
    expect(sent("spectrum")).toHaveLength(2);
  });

  it("stops reading only when the worker drops its views", () => {
    const bins = new Float32Array([-30, -40]);
    const { host, canvas, tick, sent, reply } = setup(() => [
      { id: "m1", bins },
    ]);
    host.attachView("preview", canvas, 15);

    reply({ type: "error", message: "bad graph command" });
    tick();
    expect(sent("spectrum")).toHaveLength(1);

    reply({
      type: "spectrumBuffer",
      moduleId: "m1",
      bins: new Float32Array(2),
    });
    reply({ type: "viewsDropped" });
    tick();
    expect(sent("spectrum")).toHaveLength(1);
  });
});
