import type { Context } from "@blibliki/utils";
import { describe, expect, it, vi } from "vitest";
import { Transport, TransportState } from "../src/Transport";

describe("Transport", () => {
  it("should emit state changes through TransportProperty callbacks", () => {
    const context = { currentTime: 0 } as Context;
    const transport = new Transport(context);
    const callback = vi.fn();

    transport.addPropertyChangeCallback("state", callback);

    transport.start(0);
    transport.stop(1);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      TransportState.playing,
      expect.any(Number),
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      TransportState.paused,
      expect.any(Number),
    );
  });

  it("should emit state changes using scheduler-aligned context time", () => {
    const context = { currentTime: 0 } as Context;
    const transport = new Transport(context);
    const callback = vi.fn();

    transport.addPropertyChangeCallback("state", callback);

    transport.start(0);
    transport.stop(1);

    const startContextTime = callback.mock.calls[0]?.[1] as number;
    const stopContextTime = callback.mock.calls[1]?.[1] as number;

    // Transport's clock uses a 100ms scheduling offset.
    expect(startContextTime).toBeCloseTo(0.1);
    expect(stopContextTime).toBeCloseTo(1.1);
  });
});
