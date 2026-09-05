export type View = {
  id: string;
  canvas: OffscreenCanvas;
  ctx: ImageBitmapRenderingContext;
  width: number;
  height: number;
  minInterval: number;
  lastFrame: number;
};

export class Views {
  private views = new Map<string, View>();

  get size() {
    return this.views.size;
  }

  attach(
    id: string,
    canvas: OffscreenCanvas,
    width: number,
    height: number,
    maxFps: number,
  ) {
    const ctx = canvas.getContext("bitmaprenderer");
    if (!ctx) throw new Error("bitmaprenderer context is not available");
    canvas.width = width;
    canvas.height = height;
    this.views.set(id, {
      id,
      canvas,
      ctx,
      width,
      height,
      minInterval: 1000 / maxFps,
      lastFrame: -Infinity,
    });
  }

  resize(id: string, width: number, height: number) {
    const view = this.views.get(id);
    if (!view) return;
    view.width = width;
    view.height = height;
    view.canvas.width = width;
    view.canvas.height = height;
  }

  detach(id: string) {
    this.views.delete(id);
  }

  clear() {
    this.views.clear();
  }

  // The largest view sets the render resolution; smaller views get a
  // downscaled copy.
  renderSize() {
    let width = 1;
    let height = 1;
    for (const view of this.views.values()) {
      width = Math.max(width, view.width);
      height = Math.max(height, view.height);
    }

    return { width, height };
  }

  due(now: number): View[] {
    const due: View[] = [];
    for (const view of this.views.values()) {
      if (now - view.lastFrame < view.minInterval) continue;
      view.lastFrame = now;
      due.push(view);
    }

    return due;
  }
}
