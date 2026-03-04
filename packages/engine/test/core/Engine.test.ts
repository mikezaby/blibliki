import { describe, expect, it, vi } from "vitest";

describe("Engine", () => {
  it("disposes midi device manager when engine is disposed", (ctx) => {
    const disposeSpy = vi.spyOn(ctx.engine.midiDeviceManager as any, "dispose");

    ctx.engine.dispose();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
