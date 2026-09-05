import { describe, expect, it, vi } from "vitest";
import { Views } from "@/render/Views";

function fakeCanvas() {
  const ctx = { transferFromImageBitmap: vi.fn() };
  return {
    canvas: {
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as OffscreenCanvas,
    ctx,
  };
}

describe("Views", () => {
  it("attaches, sizes the canvas and reports the largest render size", () => {
    const views = new Views();
    const a = fakeCanvas();
    const b = fakeCanvas();

    views.attach("preview", a.canvas, 160, 90, 15);
    views.attach("projector", b.canvas, 1280, 720, 60);

    expect(views.size).toBe(2);
    expect(a.canvas.width).toBe(160);
    expect(views.renderSize()).toEqual({ width: 1280, height: 720 });

    views.detach("projector");
    expect(views.renderSize()).toEqual({ width: 160, height: 90 });
  });

  it("caps each view at its frame rate", () => {
    const views = new Views();
    views.attach("preview", fakeCanvas().canvas, 160, 90, 10);

    expect(views.due(0).map((v) => v.id)).toEqual(["preview"]);
    expect(views.due(50)).toEqual([]);
    expect(views.due(100).map((v) => v.id)).toEqual(["preview"]);
  });

  it("replaces a view attached under the same id", () => {
    const views = new Views();
    views.attach("preview", fakeCanvas().canvas, 160, 90, 15);
    views.attach("preview", fakeCanvas().canvas, 320, 180, 15);

    expect(views.size).toBe(1);
    expect(views.renderSize()).toEqual({ width: 320, height: 180 });
  });

  it("renderSize is 1x1 with no views", () => {
    expect(new Views().renderSize()).toEqual({ width: 1, height: 1 });
  });
});
