# Video Patch Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Edit video patches on the grid's patchbay canvas beside audio
modules, with a Visuals node that previews the output and opens the
projector, and per-prop bindings to spectrum bands and audio props.

**Architecture:** The video engine worker renders to an internal canvas and
copies frames to attached views (node preview, projector). In the grid, a
`videoPatchSlice` is the source of truth for the video patch; a store
subscription sends the whole patch to the worker on every change. Video
nodes share the ReactFlow canvas with audio nodes and are told apart by node
type; gridNodes thunks branch on that. Design:
`docs/plans/2026-09-05-video-patch-editor-design.md`, ADR 4.

**Tech Stack:** TypeScript, React 19, Redux Toolkit, @xyflow/react,
@blibliki/ui, vitest (node and jsdom), `@blibliki/video-engine`.

---

## Conventions for every task

- Worktree `.worktrees/feat/62-bootstrap-video-engine-package`, branch
  `feat/video-patch-editor` (stacked on the bootstrap branch).
- `pnpm build:packages` after any change under `packages/` before running
  the grid, since the grid consumes built packages.
- Before each commit, in the touched package or app:
  `pnpm tsc && pnpm lint && pnpm format && pnpm test`. Grid tests run with
  `CI=1 pnpm test` from `apps/grid`.
- Commit messages explain why; end with
  `Claude-Session: https://claude.ai/code/session_01GCNtALRctAK5QHfpj3p3Qo`.
- No em dashes. Comments only for a workaround, an outside constraint or a
  `// ponytail:` simplification.

Glossary: a **view** is a canvas the worker copies frames into. A
**binding** maps a named control (a spectrum band or an audio prop) onto
one numeric prop of one video module. The **texture** tone is the third
handle color, beside audio and MIDI.

---

### Task 1: Video engine views and per-module spectrum

**Files:**
- Create: `packages/video-engine/src/render/Views.ts`
- Modify: `packages/video-engine/src/render/Renderer.ts` (make `canvas` public)
- Modify: `packages/video-engine/src/protocol.ts`
- Modify: `packages/video-engine/src/handleMessage.ts`
- Modify: `packages/video-engine/src/core/controls.ts`
- Modify: `packages/video-engine/src/worker.ts`
- Modify: `packages/video-engine/src/host/VideoEngineHost.ts`
- Modify: `packages/video-engine/src/index.ts`
- Modify: `packages/video-engine/src/modules/index.ts` (export `inputsFor`, `videoModuleSchemas`)
- Test: `packages/video-engine/test/render/Views.test.ts`
- Test: `packages/video-engine/test/handleMessage.test.ts`
- Test: `packages/video-engine/test/core/controls.test.ts`
- Test: `packages/video-engine/test/modules/modules.test.ts`
- Modify: `docs/plans/2026-09-03-video-engine-design.md` (protocol paragraph and failure-mode bullet about the projector window)

**Step 1: Write the failing Views test**

`test/render/Views.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { Views } from "@/render/Views";

function fakeCanvas() {
  const ctx = { transferFromImageBitmap: vi.fn() };
  return {
    canvas: { width: 0, height: 0, getContext: () => ctx } as unknown as OffscreenCanvas,
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
```

**Step 2: Run to verify it fails**

Run from `packages/video-engine`: `pnpm test --run test/render/Views.test.ts`
Expected: FAIL, cannot resolve `@/render/Views`.

**Step 3: Write Views.ts**

```ts
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
```

**Step 4: Run the Views test**

Run: `pnpm test --run test/render/Views.test.ts`
Expected: 4 tests pass.

**Step 5: Update the protocol**

In `src/protocol.ts` replace the `init`, `resize` and `detach` members of
`HostMessage` with:
```ts
  | {
      type: "attachView";
      id: string;
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      maxFps: number;
    }
  | { type: "resizeView"; id: string; width: number; height: number }
  | { type: "detachView"; id: string }
```
change the spectrum member to `{ type: "spectrum"; moduleId: string; bins: Float32Array }`,
the `spectrumBuffer` member of `WorkerMessage` to
`{ type: "spectrumBuffer"; moduleId: string; bins: Float32Array }`, and
`GraphMessage` to exclude the three view messages.

**Step 6: Per-module spectrum naming**

In `src/core/controls.ts` change the signature to
`spectrumToControls(bins: Float32Array, prefix = "spectrum", minDb = -100, maxDb = -30)`
and the keys to `` `${prefix}:low` `` etc. In
`src/handleMessage.ts` the spectrum case becomes:
```ts
      case "spectrum":
        engine.setControls(
          spectrumToControls(message.bins, `spectrum:${message.moduleId}`),
        );
        return [
          { type: "spectrumBuffer", moduleId: message.moduleId, bins: message.bins },
        ];
```
Update `test/core/controls.test.ts` (add a case
`spectrumToControls(bins, "spectrum:m1")` yielding `"spectrum:m1:low"` and
so on; keep the default-prefix expectations) and
`test/handleMessage.test.ts` (the spectrum test sends `moduleId: "m1"` and
expects it echoed; the controls test binds to `"spectrum:m1:low"` after a
spectrum message and checks the uniform).

**Step 7: Module helpers for the grid**

Append to `src/modules/index.ts`:
```ts
export const videoModuleSchemas: Record<
  VideoModuleType,
  Record<string, PropSchema>
> = {
  [VideoModuleType.Source]: sourcePropSchema,
  [VideoModuleType.HueRotate]: hueRotatePropSchema,
  [VideoModuleType.Merge]: mergePropSchema,
  [VideoModuleType.Overlay]: overlayPropSchema,
  [VideoModuleType.Output]: outputPropSchema,
};

const MODULE_INPUTS = Object.fromEntries(
  Object.values(VideoModuleType).map((moduleType) => [
    moduleType,
    createModule({ name: moduleType, moduleType }).inputs,
  ]),
) as Record<VideoModuleType, readonly string[]>;

export function inputsFor(moduleType: VideoModuleType): readonly string[] {
  return MODULE_INPUTS[moduleType];
}
```
Import the five schemas and `PropSchema` at the top. Export both from
`src/index.ts`. Add to `test/modules/modules.test.ts`:
```ts
  it("exposes inputs and schemas by type", () => {
    expect(inputsFor(VideoModuleType.Merge)).toEqual(["a", "b"]);
    expect(Object.keys(videoModuleSchemas[VideoModuleType.HueRotate])).toEqual(["amount"]);
  });
```

**Step 8: Rewrite worker.ts around views**

```ts
import { handleMessage } from "./handleMessage";
import { HostMessage, WorkerMessage } from "./protocol";
import { Renderer } from "./render/Renderer";
import { Views } from "./render/Views";
import { VideoEngine } from "./VideoEngine";

const engine = new VideoEngine();
const views = new Views();
let renderer: Renderer | null = null;
let frameHandle = 0;

function post(message: WorkerMessage) {
  const transfer =
    message.type === "spectrumBuffer" ? [message.bins.buffer] : [];
  self.postMessage(message, { transfer });
}

function fail(error: unknown) {
  post({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  });
}

function stop() {
  cancelAnimationFrame(frameHandle);
  renderer?.dispose();
  renderer = null;
}

function frame(now: number) {
  if (views.size === 0) {
    stop();
    return;
  }
  try {
    renderer ??= new Renderer(new OffscreenCanvas(1, 1));
    const { width, height } = views.renderSize();
    renderer.resize(width, height);
    renderer.render(engine.passes());
    for (const view of views.due(now)) {
      void createImageBitmap(renderer.canvas, {
        resizeWidth: view.width,
        resizeHeight: view.height,
      }).then((bitmap) => {
        view.ctx.transferFromImageBitmap(bitmap);
      });
    }
    frameHandle = requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
    views.clear();
    stop();
  }
}

self.onmessage = (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "attachView":
        views.attach(
          message.id,
          message.canvas,
          message.width,
          message.height,
          message.maxFps,
        );
        if (views.size === 1) frameHandle = requestAnimationFrame(frame);
        post({ type: "ready" });
        return;
      case "resizeView":
        views.resize(message.id, message.width, message.height);
        return;
      case "detachView":
        views.detach(message.id);
        return;
      default:
        handleMessage(engine, message).forEach(post);
    }
  } catch (error) {
    fail(error);
  }
};
```
In `Renderer.ts` change `constructor(private canvas: OffscreenCanvas)` to
`constructor(readonly canvas: OffscreenCanvas)`.

**Step 9: Rewrite the host around views**

`src/host/VideoEngineHost.ts`:
```ts
import { HostMessage, WorkerMessage } from "@/protocol";
import { IVideoPatch } from "@/VideoEngine";
import { PatchSource, propsToControls } from "./mirror";
import { openProjectorWindow, ProjectorWindow } from "./projectorWindow";

export type SpectrumSource = { id: string; bins: Float32Array };

export type VideoEngineHostOptions = {
  patchSource: PatchSource;
  createWorker: () => Worker;
  // Current frequency bins (dB) per Spectrum module. Arrays are copied
  // before transfer, so yielding the analyser's own buffer is fine.
  readSpectrum?: () => Iterable<SpectrumSource>;
};

const PROJECTOR_VIEW = "projector";

export class VideoEngineHost {
  private worker: Worker;
  private projector: ProjectorWindow | null = null;
  private spare = new Map<string, Float32Array>();
  private inFlight = new Set<string>();
  private views = new Set<string>();
  private frameHandle = 0;
  private disposed = false;
  private patchListeners = new Set<(patch: IVideoPatch) => void>();
  private errorListeners = new Set<(message: string) => void>();

  constructor(private options: VideoEngineHostOptions) {
    this.worker = options.createWorker();
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.receive(event.data);
    };

    const { patchSource } = options;
    const initial: Record<string, number> = {};
    for (const module of patchSource.serialize().modules) {
      Object.assign(initial, propsToControls(module.id, module.props));
    }
    this.send({ type: "controls", values: initial });

    // The engine has no way to remove a props callback, so guard on disposed.
    patchSource.onPropsUpdate((update) => {
      if (this.disposed) return;
      this.send({
        type: "controls",
        values: propsToControls(update.id, update.props),
      });
    });

    this.frameHandle = requestAnimationFrame(this.tick);
  }

  // The canvas is transferred; it must not have been drawn on and cannot be
  // attached twice. Callers create a fresh element per attach.
  attachView(id: string, canvas: HTMLCanvasElement, maxFps: number) {
    const offscreen = canvas.transferControlToOffscreen();
    this.views.add(id);
    this.send(
      {
        type: "attachView",
        id,
        canvas: offscreen,
        width: canvas.width,
        height: canvas.height,
        maxFps,
      },
      [offscreen],
    );
  }

  resizeView(id: string, width: number, height: number) {
    this.send({ type: "resizeView", id, width, height });
  }

  detachView(id: string) {
    this.views.delete(id);
    this.send({ type: "detachView", id });
  }

  // Returns false when the browser blocked the popup (call from a gesture).
  open(): boolean {
    if (this.projector && !this.projector.window.closed) {
      this.projector.window.focus();
      return true;
    }

    const projector = openProjectorWindow();
    if (!projector) return false;
    this.projector = projector;

    const { window: win, canvas } = projector;
    canvas.width = win.innerWidth;
    canvas.height = win.innerHeight;
    this.attachView(PROJECTOR_VIEW, canvas, 60);

    win.addEventListener("resize", () => {
      this.resizeView(PROJECTOR_VIEW, win.innerWidth, win.innerHeight);
    });
    win.addEventListener("pagehide", () => {
      this.detachView(PROJECTOR_VIEW);
      this.projector = null;
    });

    return true;
  }

  send(message: HostMessage, transfer: Transferable[] = []) {
    if (this.disposed) return;
    this.worker.postMessage(message, transfer);
  }

  onPatch(listener: (patch: IVideoPatch) => void) {
    this.patchListeners.add(listener);
    return () => this.patchListeners.delete(listener);
  }

  onError(listener: (message: string) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    this.projector?.window.close();
    this.projector = null;
    this.worker.terminate();
  }

  private receive(message: WorkerMessage) {
    switch (message.type) {
      case "patch":
        this.patchListeners.forEach((listener) => {
          listener(message.patch);
        });
        return;
      case "error":
        this.errorListeners.forEach((listener) => {
          listener(message.message);
        });
        return;
      case "spectrumBuffer":
        this.spare.set(message.moduleId, message.bins);
        this.inFlight.delete(message.moduleId);
        return;
      case "ready":
        return;
    }
  }

  // One buffer per Spectrum module in flight: copy the analyser's bins into
  // it, transfer it, and get it back on spectrumBuffer. Frames while a
  // buffer is away are skipped. Nothing is read while no view is attached.
  private tick = () => {
    if (this.disposed) return;
    const { readSpectrum } = this.options;
    if (readSpectrum && this.views.size > 0) {
      for (const { id, bins } of readSpectrum()) {
        if (this.inFlight.has(id)) continue;
        let buffer = this.spare.get(id);
        if (buffer?.length !== bins.length) buffer = new Float32Array(bins.length);
        this.spare.delete(id);
        this.inFlight.add(id);
        buffer.set(bins);
        this.send({ type: "spectrum", moduleId: id, bins: buffer }, [buffer.buffer]);
      }
    }
    this.frameHandle = requestAnimationFrame(this.tick);
  };
}
```
Export `SpectrumSource` from `src/index.ts`.

**Step 10: Design doc corrections**

In `docs/plans/2026-09-03-video-engine-design.md`: the Protocol paragraph
now lists `attachView`, `resizeView`, `detachView` instead of `init`,
`resize`, `detach`, and `spectrum` carries a module id; the failure-mode
bullet "A closed projector window pauses rendering" becomes "Detaching the
last view stops rendering; the graph stays alive".

**Step 11: Run all package checks, build, commit**

Run from `packages/video-engine`: `pnpm test --run && pnpm tsc && pnpm lint && pnpm format && pnpm build`
Expected: all pass, `dist/worker.js` rebuilt.

```bash
git add packages/video-engine docs/plans/2026-09-03-video-engine-design.md
git commit -m "feat(video-engine): render to views, spectrum per module

The worker renders into an internal canvas and copies frames to any
number of attached views with their own frame-rate caps, so a node
preview and the projector share one WebGL context and the preview
outlives the popup. Spectrum controls are named by module id so several
Spectrum modules give distinct bands."
```

---

### Task 2: Patch model carries the video patch

**Files:**
- Modify: `packages/models/package.json` (add `"@blibliki/video-engine": "workspace:^"` to dependencies)
- Modify: `packages/models/src/Patch.ts`
- Test: `apps/grid/test/patch/patchModelBuild.test.ts`

**Step 1: Add the failing assertion**

In `apps/grid/test/patch/patchModelBuild.test.ts`, inside the existing
describe, add:
```ts
  it("defaults to an empty video patch", () => {
    expect(Patch.build().config.video).toEqual({ modules: [], routes: [], bindings: [] });
  });
```

**Step 2: Run to verify it fails**

Run from `apps/grid`: `CI=1 pnpm exec vitest run test/patch/patchModelBuild.test.ts`
Expected: FAIL, `video` is undefined.

**Step 3: Extend the model**

In `packages/models/src/Patch.ts`:
```ts
import type { IVideoPatch } from "@blibliki/video-engine";
```
add `video?: IVideoPatch;` to `IConfig`, `data?: AnyObject;` to the local
`Edge` type, and `video: { modules: [], routes: [], bindings: [] }` to
`DEFAULT_PATCH.config`. `video` stays optional in `IConfig` because saved
patches predate it.

**Step 4: Install, build, run the test**

Run from the repo root: `pnpm install && pnpm build:packages`
Run from `apps/grid`: `CI=1 pnpm exec vitest run test/patch/patchModelBuild.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/models pnpm-lock.yaml apps/grid/test/patch/patchModelBuild.test.ts
git commit -m "feat(models): patch config carries the video patch

Optional, because saved patches predate it; loading one yields an empty
video patch."
```

---

### Task 3: videoPatchSlice and patch load, save, clear

**Files:**
- Create: `apps/grid/src/video/videoPatchSlice.ts`
- Modify: `apps/grid/src/store/index.ts`
- Modify: `apps/grid/src/patchSlice.ts` (load, save, clearEngine)
- Test: `apps/grid/test/video/videoPatchSlice.test.ts`

**Step 1: Write the failing reducer test**

```ts
// @vitest-environment node
import { VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it } from "vitest";
import reducer, {
  addVideoModule,
  addVideoRoute,
  EMPTY_VIDEO_PATCH,
  removeBindingsForAudioModule,
  removeVideoModule,
  setVideoBinding,
  updateVideoModuleProps,
} from "../../src/video/videoPatchSlice";

const src = { id: "src", name: "Source", moduleType: VideoModuleType.Source, props: { mode: "solid" as const, hue: 0, saturation: 1, lightness: 0.5, spread: 180 } };
const fx = { id: "fx", name: "Hue", moduleType: VideoModuleType.HueRotate, props: { amount: 0 } };
const route = { id: "r1", source: { moduleId: "src", ioName: "out" }, destination: { moduleId: "fx", ioName: "in" } };
const binding = { id: "fx:amount", moduleId: "fx", prop: "amount", control: "spectrum:spec1:low", inMin: 0, inMax: 1, outMin: 0, outMax: 360 };

function patch() {
  let state = reducer(EMPTY_VIDEO_PATCH, addVideoModule(src));
  state = reducer(state, addVideoModule(fx));
  state = reducer(state, addVideoRoute(route));
  return reducer(state, setVideoBinding(binding));
}

describe("videoPatchSlice", () => {
  it("updates props by merging", () => {
    const state = reducer(patch(), updateVideoModuleProps({ id: "fx", props: { amount: 90 } }));
    expect(state.modules[1]?.props).toEqual({ amount: 90 });
  });

  it("replaces a route into an occupied input", () => {
    const state = reducer(patch(), addVideoRoute({ ...route, id: "r2" }));
    expect(state.routes.map((r) => r.id)).toEqual(["r2"]);
  });

  it("removing a module drops its routes and bindings", () => {
    const state = reducer(patch(), removeVideoModule("fx"));
    expect(state.modules.map((m) => m.id)).toEqual(["src"]);
    expect(state.routes).toEqual([]);
    expect(state.bindings).toEqual([]);
  });

  it("setting a binding replaces one with the same id", () => {
    const state = reducer(patch(), setVideoBinding({ ...binding, outMax: 180 }));
    expect(state.bindings).toEqual([{ ...binding, outMax: 180 }]);
  });

  it("drops bindings that read a removed audio module", () => {
    const state = reducer(patch(), removeBindingsForAudioModule("spec1"));
    expect(state.bindings).toEqual([]);
  });
});
```

**Step 2: Run to verify it fails**

Run from `apps/grid`: `CI=1 pnpm exec vitest run test/video/videoPatchSlice.test.ts`
Expected: FAIL, cannot resolve the slice.

**Step 3: Write the slice**

`apps/grid/src/video/videoPatchSlice.ts`:
```ts
import {
  createModule,
  type IBinding,
  type IRoute,
  type IVideoModule,
  type IVideoPatch,
  VideoModuleType,
} from "@blibliki/video-engine";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { XYPosition } from "@xyflow/react";
import { addNode } from "@/components/Grid/gridNodesSlice";
import { addNotification } from "@/notificationsSlice";
import type { AppDispatch, RootState } from "@/store";

export const EMPTY_VIDEO_PATCH: IVideoPatch = { modules: [], routes: [], bindings: [] };

export const VIDEO_MODULE_NAMES: Record<VideoModuleType, string> = {
  [VideoModuleType.Source]: "Source",
  [VideoModuleType.HueRotate]: "Hue Rotate",
  [VideoModuleType.Merge]: "Merge",
  [VideoModuleType.Overlay]: "Overlay",
  [VideoModuleType.Output]: "Visuals",
};

const samePlug = (a: IRoute["destination"], b: IRoute["destination"]) =>
  a.moduleId === b.moduleId && a.ioName === b.ioName;

export const videoPatchSlice = createSlice({
  name: "videoPatch",
  initialState: EMPTY_VIDEO_PATCH,
  reducers: {
    setVideoPatch: (_, action: PayloadAction<IVideoPatch>) => action.payload,
    clearVideoPatch: () => EMPTY_VIDEO_PATCH,
    addVideoModule: (state, action: PayloadAction<IVideoModule>) => {
      state.modules.push(action.payload);
    },
    removeVideoModule: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.modules = state.modules.filter((m) => m.id !== id);
      state.routes = state.routes.filter(
        (r) => r.source.moduleId !== id && r.destination.moduleId !== id,
      );
      state.bindings = state.bindings.filter((b) => b.moduleId !== id);
    },
    updateVideoModuleProps: (
      state,
      action: PayloadAction<{ id: string; props: Record<string, unknown> }>,
    ) => {
      const module = state.modules.find((m) => m.id === action.payload.id);
      if (module) Object.assign(module.props, action.payload.props);
    },
    addVideoRoute: (state, action: PayloadAction<IRoute>) => {
      state.routes = state.routes.filter(
        (r) => !samePlug(r.destination, action.payload.destination),
      );
      state.routes.push(action.payload);
    },
    removeVideoRoute: (state, action: PayloadAction<string>) => {
      state.routes = state.routes.filter((r) => r.id !== action.payload);
    },
    setVideoBinding: (state, action: PayloadAction<IBinding>) => {
      state.bindings = state.bindings.filter((b) => b.id !== action.payload.id);
      state.bindings.push(action.payload);
    },
    removeVideoBinding: (state, action: PayloadAction<string>) => {
      state.bindings = state.bindings.filter((b) => b.id !== action.payload);
    },
    removeBindingsForAudioModule: (state, action: PayloadAction<string>) => {
      const prefixes = [`patch:${action.payload}:`, `spectrum:${action.payload}:`];
      state.bindings = state.bindings.filter(
        (b) => !prefixes.some((p) => b.control.startsWith(p)),
      );
    },
  },
});

export const {
  setVideoPatch,
  clearVideoPatch,
  addVideoModule,
  removeVideoModule,
  updateVideoModuleProps,
  addVideoRoute,
  removeVideoRoute,
  setVideoBinding,
  removeVideoBinding,
  removeBindingsForAudioModule,
} = videoPatchSlice.actions;

export const addNewVideoModule =
  (params: { type: VideoModuleType; position: XYPosition }) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const { type, position } = params;
    const hasOutput = getState().videoPatch.modules.some(
      (m) => m.moduleType === VideoModuleType.Output,
    );
    if (type === VideoModuleType.Output && hasOutput) {
      dispatch(
        addNotification({
          type: "warning",
          title: "One Visuals module per patch",
          message: "The patch already has a Visuals module.",
        }),
      );
      return;
    }

    const module = createModule({
      name: VIDEO_MODULE_NAMES[type],
      moduleType: type,
    }).serialize();
    dispatch(addVideoModule(module));
    dispatch(addNode({ id: module.id, type: "videoNode", position, data: {} }));
  };

export const selectVideoModule = (state: RootState, id: string) =>
  state.videoPatch.modules.find((m) => m.id === id);

export default videoPatchSlice.reducer;
```

**Step 4: Register and wire the patch lifecycle**

In `apps/grid/src/store/index.ts` add `videoPatch: videoPatchReducer`
(import from `@/video/videoPatchSlice`).

In `apps/grid/src/patchSlice.ts`:
- `load`: after `dispatch(setBpm(bpm))` add
  `dispatch(setVideoPatch(config.video ?? EMPTY_VIDEO_PATCH));`
- `save`: `const config = { bpm, modules, gridNodes, video: state.videoPatch };`
- `clearEngine`: after `dispatch(removeAllGridNodes())` add
  `dispatch(clearVideoPatch());`

Check `apps/grid/src/patch/patchPayloadValidation.ts` still accepts the
payload (it walks for `undefined`; the video patch has none).

**Step 5: Run tests and checks**

Run from `apps/grid`: `CI=1 pnpm test && pnpm tsc && pnpm lint && pnpm format`
Expected: all pass, including `test/patch/*` which exercise load and save.

**Step 6: Commit**

```bash
git add apps/grid/src/video/videoPatchSlice.ts apps/grid/src/store/index.ts apps/grid/src/patchSlice.ts apps/grid/test/video/videoPatchSlice.test.ts
git commit -m "feat(grid): videoPatchSlice, loaded and saved with the patch

Source of truth for video modules, routes and bindings, mirroring
modulesSlice for audio. Bindings that read a removed audio module are
dropped by prefix so the picker never shows a dead control."
```

---

### Task 4: gridNodes branches on node type, texture handle tone

**Files:**
- Modify: `apps/grid/src/components/Grid/gridNodesSlice.ts`
- Modify: `apps/grid/src/hooks/index.ts` (`useGridNodes`)
- Modify: `apps/grid/src/components/AudioModule/modulesSlice.ts` (`removeModule` drops bindings)
- Modify: `apps/grid/src/components/Grid/AudioNode.tsx` (texture tone, export `IO` and `IOContainer`)
- Modify: `apps/grid/src/styles/app.css`
- Test: `apps/grid/test/Grid/gridNodesVideo.test.ts`
- Test: `apps/grid/test/Grid/AudioNode.test.ts`

**Step 1: Write the failing thunk test**

`apps/grid/test/Grid/gridNodesVideo.test.ts`:
```ts
// @vitest-environment node
import { Engine } from "@blibliki/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  connect,
  hydrateEngineRoutes,
  onEdgesChange,
  onNodesChange,
} from "../../src/components/Grid/gridNodesSlice";

type Action = { type: string; payload?: unknown };

const nodes = [
  { id: "osc", type: "audioNode", position: { x: 0, y: 0 }, data: {} },
  { id: "src", type: "videoNode", position: { x: 0, y: 0 }, data: {} },
  { id: "fx", type: "videoNode", position: { x: 0, y: 0 }, data: {} },
];

function harness(edges: { id: string; source: string; target: string }[] = []) {
  const actions: Action[] = [];
  const getState = () =>
    ({ gridNodes: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } } }) as never;
  const dispatch = (action: unknown) => {
    if (typeof action === "function") {
      return (action as (d: typeof dispatch, g: typeof getState) => unknown)(dispatch, getState);
    }
    actions.push(action as Action);
    return action;
  };
  return { actions, dispatch, getState };
}

describe("gridNodes video branching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connect between video nodes adds a video route and an edge, not an engine route", () => {
    const addRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({ addRoute } as unknown as Engine);
    const { actions, dispatch, getState } = harness();

    connect({ source: "src", sourceHandle: "out", target: "fx", targetHandle: "in" })(dispatch as never, getState);

    expect(addRoute).not.toHaveBeenCalled();
    expect(actions.map((a) => a.type)).toEqual(["videoPatch/addVideoRoute", "gridNodes/addEdge"]);
  });

  it("removing a video edge removes the video route, not an engine route", () => {
    const removeRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({ removeRoute } as unknown as Engine);
    const { actions, dispatch, getState } = harness([{ id: "e1", source: "src", target: "fx" }]);

    onEdgesChange([{ type: "remove", id: "e1" }])(dispatch as never, getState);

    expect(removeRoute).not.toHaveBeenCalled();
    expect(actions.map((a) => a.type)).toEqual(["videoPatch/removeVideoRoute", "gridNodes/applyEdgeChanges"]);
  });

  it("removing a video node removes the video module", () => {
    const { actions, dispatch, getState } = harness();

    onNodesChange([{ type: "remove", id: "src" }])(dispatch as never, getState);

    expect(actions.map((a) => a.type)).toEqual(["gridNodes/setNodes", "videoPatch/removeVideoModule"]);
  });

  it("hydrateEngineRoutes skips video edges", () => {
    const addRoute = vi.fn();
    vi.spyOn(Engine, "current", "get").mockReturnValue({ addRoute } as unknown as Engine);

    hydrateEngineRoutes({
      nodes,
      edges: [
        { id: "e1", source: "src", sourceHandle: "out", target: "fx", targetHandle: "in" },
        { id: "e2", source: "osc", sourceHandle: "out", target: "osc", targetHandle: "in" },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(addRoute).toHaveBeenCalledTimes(1);
    expect(addRoute.mock.calls[0]?.[0]).toMatchObject({ id: "e2" });
  });
});
```

**Step 2: Run to verify it fails**

Run: `CI=1 pnpm exec vitest run test/Grid/gridNodesVideo.test.ts`
Expected: FAIL, `connect` is not exported.

**Step 3: Change gridNodesSlice**

- Add helpers near the top:
```ts
export const isVideoNode = (node: Pick<Node, "type">) => node.type === "videoNode";
export const videoNodeIds = (nodes: Node[]) =>
  new Set(nodes.filter(isVideoNode).map((node) => node.id));
```
- Replace the `onEdgesChange` reducer with a pure `applyEdgeChanges`
  reducer (same body minus the `Engine.current.removeRoute` loop) and add
  an `addEdge` reducer: `state.edges = addGridEdge(action.payload, state.edges);`
  with `PayloadAction<Edge>`.
- Export the new thunks:
```ts
export const onEdgesChange =
  (changes: EdgeChange[]) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const { nodes, edges } = getState().gridNodes;
    const video = videoNodeIds(nodes);

    changes.forEach((change) => {
      if (change.type !== "remove") return;
      const edge = edges.find((candidate) => candidate.id === change.id);
      if (edge && video.has(edge.source)) {
        dispatch(removeVideoRoute(change.id));
      } else {
        Engine.current.removeRoute(change.id);
      }
    });

    dispatch(applyEdgeChanges(changes));
  };

export const connect =
  (connection: Connection) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const video = videoNodeIds(getState().gridNodes.nodes);
    const { source, target } = connection;
    if (source && target && video.has(source) && video.has(target)) {
      const id = uuidv4();
      dispatch(addVideoRoute({ id, ...connectionToRoute(connection) }));
      dispatch(addEdge({ id, ...connection }));
      return;
    }

    dispatch(onConnect(connection));
  };
```
  (`uuidv4` from `@blibliki/utils`; `addVideoRoute`, `removeVideoRoute`,
  `removeVideoModule` from `@/video/videoPatchSlice`.)
- In `onNodesChange`, capture `const { nodes } = getState().gridNodes;`
  before dispatching `setNodes`, and in the remove loop:
```ts
      const node = nodes.find((candidate) => candidate.id === change.id);
      dispatch(node && isVideoNode(node) ? removeVideoModule(change.id) : removeModule(change.id));
```
- In `hydrateEngineRoutes`, compute `const video = videoNodeIds(gridNodes.nodes);`
  and `if (video.has(edge.source)) return;` at the top of the loop.
- Keep the `onConnect` reducer (audio) and its export; `clipboard.ts` still
  uses it.

Import cycle note: `videoPatchSlice` imports `addNode` from
`gridNodesSlice`, and `gridNodesSlice` now imports from `videoPatchSlice`.
Both import only action creators used at call time, the same pattern
`modulesSlice` and `gridNodesSlice` already use, so it resolves.

**Step 4: Update useGridNodes**

In `apps/grid/src/hooks/index.ts`, `useGridNodes`:
- `onEdgesChange` and `onConnect` dispatch the thunks:
  `dispatch(_onEdgesChange(changes))` stays (it now imports the thunk) and
  `onConnect` becomes `dispatch(connect(connection))`.
- `isValidConnection` reads `videoModules` from the store
  (add `const videoModules = useAppSelector((state) => state.videoPatch.modules);`)
  and lists only `[videoModules]` in its deps, since `nodes` changes identity
  on every drag frame:
```ts
      const sourceIsVideo = videoModules.some((m) => m.id === source);
      const targetIsVideo = videoModules.some((m) => m.id === target);
      if (sourceIsVideo !== targetIsVideo) return false;
      if (sourceIsVideo) {
        const targetModule = videoModules.find((m) => m.id === target);
        return (
          source !== target &&
          sourceHandle === "out" &&
          targetModule !== undefined &&
          inputsFor(targetModule.moduleType).includes(targetHandle)
        );
      }
      return Engine.current.validRoute({ ... });
```
  with `inputsFor` from `@blibliki/video-engine`. Add `nodes` and
  `videoModules` to the `useCallback` deps.

**Step 5: Audio module removal drops bindings**

In `modulesSlice.ts` `removeModule`, after `Engine.current.removeModule(id);`
add `dispatch(removeBindingsForAudioModule(id));`.

**Step 6: Texture tone**

In `AudioNode.tsx`:
- `type IOTone = "audio" | "midi" | "texture";` and in `getIOTone`, return
  `"texture"` when `ioType.toLowerCase().includes("texture")` (check before
  audio).
- Add the texture branch in `getIOToneClasses` returning
  `io-handle--texture`, `io-indicator--texture`, `io-label--texture`.
- `export function IO({ io }: { io: Pick<IIOSerialize, "name" | "ioType"> })`
  and `export function IOContainer(...)`. Update the `key={io.id}` uses to
  `key={io.name}` where the pick lacks `id`, or keep `IIOSerialize` for the
  audio call sites and pass `{ name, ioType }` objects from VideoNode with
  the Pick type.

In `app.css`, after the midi rules, add the same three rules for
`--texture` using `--ui-color-success-500` and `--ui-color-success-600`,
with `border-radius: 2px` on the indicator like MIDI but a square-ish
`border-radius: 3px` on the handle is not needed: keep the handle round,
only the color differs.

Add to `test/Grid/AudioNode.test.ts`:
```ts
    expect(getIOToneClasses("TextureInput")).toEqual({
      tone: "texture",
      handleToneClass: "io-handle--texture",
      indicatorToneClass: "io-indicator--texture",
      labelToneClass: "io-label--texture",
    });
```
and, in the test that reads `app.css`, an assertion that it contains
`.io-handle--texture`.

**Step 7: Clipboard check**

Read `apps/grid/src/components/Grid/clipboard.ts`
`buildGridClipboardSnapshot`: it maps selected node ids to audio modules.
Confirm a selected video node is skipped (no audio module for its id)
rather than throwing. If it throws, filter `nodes` to `!isVideoNode(node)`
first. Copying video nodes is out of scope; not crashing is in scope.

**Step 8: Run tests and checks, commit**

Run from `apps/grid`: `CI=1 pnpm test && pnpm tsc && pnpm lint && pnpm format`
Expected: all pass.

```bash
git add apps/grid/src/components/Grid apps/grid/src/hooks/index.ts apps/grid/src/components/AudioModule/modulesSlice.ts apps/grid/src/styles/app.css apps/grid/test/Grid
git commit -m "feat(grid): grid nodes branch on video node type, texture tone

Connect, edge removal and node removal route to the video slice when the
nodes are video nodes, and engine route hydration skips video edges.
Texture handles get a third tone so a cable's kind is visible."
```

---

### Task 5: Video host, VideoNode, palette and drop

**Files:**
- Create: `apps/grid/src/video/videoHost.ts`
- Create: `apps/grid/src/components/Grid/VideoNode.tsx`
- Create: `apps/grid/src/components/VideoModule/VideoField.tsx`
- Create: `apps/grid/src/components/VideoModule/VisualsBody.tsx`
- Modify: `apps/grid/src/components/Grid/AudioNode.tsx` (`NodeTypes` gains `videoNode`)
- Modify: `apps/grid/src/components/Grid/index.tsx` (dispose host on engine change)
- Modify: `apps/grid/src/components/Grid/AudioModules.tsx` (Video section)
- Modify: `apps/grid/src/components/Grid/useDrag.ts` (`video:` drop)
- Test: `apps/grid/test/video/VisualsBody.test.tsx`

**Step 1: Write the failing VisualsBody test**

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VisualsBody from "../../src/components/VideoModule/VisualsBody";

const { host } = vi.hoisted(() => ({
  host: { attachView: vi.fn(), detachView: vi.fn(), open: vi.fn(() => true) },
}));

vi.mock("../../src/video/videoHost", () => ({
  ensureVideoHost: () => host,
}));

describe("VisualsBody", () => {
  afterEach(cleanup);

  it("attaches a preview view on mount and detaches on unmount", () => {
    const { unmount } = render(<VisualsBody id="out" />);

    expect(host.attachView).toHaveBeenCalledWith("out", expect.any(HTMLCanvasElement), 15);

    unmount();

    expect(host.detachView).toHaveBeenCalledWith("out");
  });

  it("opens the projector from its button", () => {
    render(<VisualsBody id="out" />);

    fireEvent.click(screen.getByRole("button", { name: /open projector/i }));

    expect(host.open).toHaveBeenCalled();
  });
});
```

**Step 2: Run to verify it fails**

Run: `CI=1 pnpm exec vitest run test/video/VisualsBody.test.tsx`
Expected: FAIL, cannot resolve VisualsBody.

**Step 3: Write videoHost.ts**

```ts
import { Engine, ModuleType } from "@blibliki/engine";
import { VideoEngineHost, type SpectrumSource } from "@blibliki/video-engine";
import VideoWorker from "@blibliki/video-engine/worker?worker";
import { addNotification } from "@/notificationsSlice";
import type { IVideoPatch } from "@blibliki/video-engine";

type HostStore = {
  getState: () => { videoPatch: IVideoPatch };
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: ReturnType<typeof addNotification>) => unknown;
};

let host: VideoEngineHost | null = null;
let hostEngineId = "";
let unsubscribe: (() => void) | null = null;

function readSpectra(engine: Engine) {
  return function* (): Iterable<SpectrumSource> {
    for (const module of engine.modules.values()) {
      if (module.moduleType === ModuleType.Spectrum) {
        yield { id: module.id, bins: module.getFrequencies() };
      }
    }
  };
}

// One host per audio engine. Nodes call this lazily, so the worker starts
// with the first Visuals node and follows the engine when a patch reloads.
export function ensureVideoHost(store: HostStore): VideoEngineHost {
  const engine = Engine.current;
  if (host && hostEngineId === engine.id) return host;
  disposeVideoHost();

  const created = new VideoEngineHost({
    patchSource: engine,
    createWorker: () => new VideoWorker(),
    readSpectrum: readSpectra(engine),
  });
  created.onError((message) => {
    store.dispatch(addNotification({ type: "error", title: "Video engine", message }));
  });

  // ponytail: the whole patch is re-sent on every change; per-command
  // messages if a patch ever grows large enough for that to show.
  let last = store.getState().videoPatch;
  created.send({ type: "load", patch: last });
  unsubscribe = store.subscribe(() => {
    const next = store.getState().videoPatch;
    if (next === last) return;
    last = next;
    created.send({ type: "load", patch: next });
  });

  host = created;
  hostEngineId = engine.id;
  return created;
}

export function disposeVideoHost() {
  unsubscribe?.();
  unsubscribe = null;
  host?.dispose();
  host = null;
  hostEngineId = "";
}
```
The `store` is passed in rather than imported so this module never joins
the store's import graph. Call sites pass the `store` from `@/store`.

**Step 4: Write VisualsBody.tsx**

```tsx
import { Button, Stack } from "@blibliki/ui";
import { Projector } from "lucide-react";
import { useEffect, useRef } from "react";
import { store } from "@/store";
import { ensureVideoHost } from "@/video/videoHost";

const PREVIEW = { width: 160, height: 90, fps: 15 };

export default function VisualsBody({ id }: { id: string }) {
  const frameRef = useRef<HTMLDivElement>(null);

  // A canvas can be transferred once, so each effect run makes a fresh one.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW.width;
    canvas.height = PREVIEW.height;
    canvas.className = "block rounded bg-black";
    frame.replaceChildren(canvas);
    const host = ensureVideoHost(store);
    host.attachView(id, canvas, PREVIEW.fps);

    return () => {
      host.detachView(id);
      canvas.remove();
    };
  }, [id]);

  return (
    <Stack gap={2} align="center">
      <div ref={frameRef} style={{ width: PREVIEW.width, height: PREVIEW.height }} />
      <Button
        size="sm"
        variant="contained"
        color="neutral"
        onClick={() => {
          ensureVideoHost(store).open();
        }}
      >
        <Projector className="h-4 w-4" />
        Open projector
      </Button>
    </Stack>
  );
}
```
If `HTMLCanvasElement.transferControlToOffscreen` is missing in jsdom the
test still passes because the host is mocked.

**Step 5: Write VideoField.tsx**

```tsx
import type { PropSchema } from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import { InputField, SelectField } from "@/components/AudioModule/attributes/Field";
import { useAppDispatch } from "@/hooks";
import { updateVideoModuleProps } from "@/video/videoPatchSlice";

type Props = {
  moduleId: string;
  prop: string;
  schema: PropSchema;
  value: unknown;
};

export default function VideoField({ moduleId, prop, schema, value }: Props) {
  const dispatch = useAppDispatch();
  const onChange = (next: unknown) => {
    dispatch(updateVideoModuleProps({ id: moduleId, props: { [prop]: next } }));
  };

  if (schema.kind === "enum") {
    return (
      <SelectField value={value as string} schema={schema as never} onChange={onChange} />
    );
  }
  if (schema.kind === "number") {
    return (
      <Stack gap={1}>
        <InputField value={value as number} schema={schema} onChange={onChange} />
      </Stack>
    );
  }

  return null;
}
```
The engine's `PropSchema` type is structurally identical to the video
engine's (Task 1 of the bootstrap copied it), so `Field.tsx` accepts video
schemas unchanged. Task 6 adds the binding control inside the number
branch's `Stack`.

**Step 6: Write VideoNode.tsx**

```tsx
import { Stack, Text } from "@blibliki/ui";
import type { NodeProps } from "@xyflow/react";
import { inputsFor, videoModuleSchemas, VideoModuleType } from "@blibliki/video-engine";
import VideoField from "@/components/VideoModule/VideoField";
import VisualsBody from "@/components/VideoModule/VisualsBody";
import { useAppSelector } from "@/hooks";
import { selectVideoModule } from "@/video/videoPatchSlice";
import { getNodeContainerClassName, IO, IOContainer } from "./AudioNode";

export default function VideoNode({ id, selected }: NodeProps) {
  const module = useAppSelector((state) => selectVideoModule(state, id));
  if (!module) return null;

  const inputs = inputsFor(module.moduleType);
  const isOutput = module.moduleType === VideoModuleType.Output;
  const schema = videoModuleSchemas[module.moduleType];
  const props = module.props as Record<string, unknown>;

  return (
    <div className={getNodeContainerClassName(selected)}>
      {inputs.length > 0 && (
        <IOContainer type="input">
          {inputs.map((name) => (
            <IO key={name} io={{ name, ioType: "TextureInput" }} />
          ))}
        </IOContainer>
      )}

      <Stack gap={2} className="relative justify-center p-3">
        <Stack direction="row" align="center" gap={2}>
          <div className="io-indicator--texture h-2 w-2 rounded-full" />
          <Text asChild size="sm" weight="medium" className="truncate">
            <span>{module.name}</span>
          </Text>
        </Stack>
        {isOutput ? (
          <VisualsBody id={module.id} />
        ) : (
          <Stack direction="row" gap={2} className="flex-wrap">
            {Object.entries(schema).map(([prop, propSchema]) => (
              <VideoField
                key={prop}
                moduleId={module.id}
                prop={prop}
                schema={propSchema}
                value={props[prop]}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {!isOutput && (
        <IOContainer type="output">
          <IO io={{ name: "out", ioType: "TextureOutput" }} />
        </IOContainer>
      )}
    </div>
  );
}
```
In `AudioNode.tsx`: `export const NodeTypes = { audioNode: AudioNode, videoNode: VideoNode };`
(import VideoNode; the circular import between the two files is
type-and-component only and resolves at render time).

**Step 7: Palette and drop**

`AudioModules.tsx`: after the audio `<ul>`, add a `Divider`, a heading
"Video" in the same `Text` style, and a second `<ul>` over
`Object.values(VideoModuleType)` rendering the same `Button` with
`VIDEO_MODULE_NAMES[type]` as label, `onDragStart(event, `video:${type}`)`,
and the dot class `io-indicator--texture` instead of the brand gradient.

`useDrag.ts` `onDrop`:
```ts
    const raw = event.dataTransfer.getData("application/reactflow");
    if (raw.startsWith("video:")) {
      dispatch(addNewVideoModule({ type: raw.slice("video:".length) as VideoModuleType, position }));
      return;
    }
    const type = raw as AvailableModuleType;
```

**Step 8: Dispose the host with the engine**

In `Grid/index.tsx` `GridCanvas`, add
```ts
  const engineId = useAppSelector((state) => state.global.engineId);
  useEffect(() => () => { disposeVideoHost(); }, [engineId]);
```
(import `useAppSelector` from `@/hooks` and `disposeVideoHost` from
`@/video/videoHost`). The cleanup runs when the engine id changes and on
unmount, which covers patch switches and leaving the page.

**Step 9: Run tests, checks, and the browser**

Run from `apps/grid`: `CI=1 pnpm test && pnpm tsc && pnpm lint && pnpm format`
Expected: all pass. If a node-environment test now imports `videoHost.ts`
transitively and fails on the `?worker` import, mock
`@/video/videoHost` in that test the way the VisualsBody test does.

Run from the repo root: `pnpm dev`, open a patch. Expected: the palette
shows a Video section; dragging Source and Visuals onto the canvas and
cabling them shows a red square in the Visuals preview; dragging a second
Visuals shows the warning notification; Open projector opens the popup with
the same picture; closing it keeps the preview running; changing Source's
hue encoder changes both.

**Step 10: Commit**

```bash
git add apps/grid/src/video apps/grid/src/components/Grid apps/grid/src/components/VideoModule apps/grid/test/video
git commit -m "feat(grid): video nodes on the patch canvas with a Visuals preview

Video modules are dragged from a Video palette section and rendered by
one VideoNode whose body is built from the module's prop schema; the
Visuals node attaches a 15 fps preview view and opens the projector.
The video host follows the audio engine and re-sends the whole patch on
every slice change."
```

---

### Task 6: Bindings

**Files:**
- Create: `apps/grid/src/video/bindableControls.ts`
- Create: `apps/grid/src/components/VideoModule/BindingControl.tsx`
- Modify: `apps/grid/src/components/VideoModule/VideoField.tsx`
- Test: `apps/grid/test/video/bindableControls.test.ts`

**Step 1: Write the failing test**

```ts
// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { bindableControls, controlLabel } from "../../src/video/bindableControls";

const modules = [
  { id: "spec1", name: "Spectrum", moduleType: ModuleType.Spectrum },
  { id: "osc1", name: "Osc", moduleType: ModuleType.Oscillator },
];

describe("bindableControls", () => {
  it("lists four bands per Spectrum module with a 0..1 range", () => {
    const controls = bindableControls(modules);
    const low = controls.find((c) => c.control === "spectrum:spec1:low");

    expect(low).toEqual({ control: "spectrum:spec1:low", label: "Spectrum · low", group: "Spectrum", min: 0, max: 1 });
    expect(controls.filter((c) => c.group === "Spectrum")).toHaveLength(4);
  });

  it("lists bounded numeric props of audio modules with their schema range", () => {
    const controls = bindableControls(modules);
    const frequency = controls.find((c) => c.control === "patch:osc1:frequency");

    expect(frequency?.group).toBe("Audio");
    expect(frequency?.label).toBe("Osc · Frequency");
    expect(frequency?.min).toBeLessThan(frequency?.max ?? 0);
  });

  it("labels an unknown control by its raw name", () => {
    expect(controlLabel(bindableControls(modules), "patch:gone:x")).toBe("patch:gone:x");
  });
});
```
Adjust the expected label of the frequency prop to the oscillator schema's
`label` if it is not "Frequency" (check
`packages/engine/src/modules/Oscillator.ts`).

**Step 2: Run to verify it fails**

Run: `CI=1 pnpm exec vitest run test/video/bindableControls.test.ts`
Expected: FAIL, cannot resolve the module.

**Step 3: Write bindableControls.ts**

```ts
import { moduleSchemas, ModuleType, type PropSchema } from "@blibliki/engine";

export type BindableControl = {
  control: string;
  label: string;
  group: "Spectrum" | "Audio";
  min: number;
  max: number;
};

type ModuleInfo = { id: string; name: string; moduleType: ModuleType };

const BANDS = ["low", "mid", "high", "level"] as const;

export function bindableControls(modules: ModuleInfo[]): BindableControl[] {
  const controls: BindableControl[] = [];

  for (const module of modules) {
    if (module.moduleType === ModuleType.Spectrum) {
      for (const band of BANDS) {
        controls.push({
          control: `spectrum:${module.id}:${band}`,
          label: `${module.name} · ${band}`,
          group: "Spectrum",
          min: 0,
          max: 1,
        });
      }
    }

    const schema = moduleSchemas[module.moduleType] as Record<string, PropSchema> | undefined;
    if (!schema) continue;
    for (const [prop, propSchema] of Object.entries(schema)) {
      if (propSchema.kind !== "number") continue;
      if (!Number.isFinite(propSchema.min) || !Number.isFinite(propSchema.max)) continue;
      controls.push({
        control: `patch:${module.id}:${prop}`,
        label: `${module.name} · ${propSchema.label}`,
        group: "Audio",
        min: propSchema.min,
        max: propSchema.max,
      });
    }
  }

  return controls;
}

export function controlLabel(controls: BindableControl[], control: string): string {
  return controls.find((c) => c.control === control)?.label ?? control;
}
```
Check how `moduleSchemas` is keyed and exported in
`packages/engine/src/modules/index.ts`; the cast above assumes a record by
`ModuleType`.

**Step 4: Write BindingControl.tsx**

```tsx
import type { NumberProp } from "@blibliki/engine";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from "@blibliki/ui";
import { Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { bindableControls, controlLabel } from "@/video/bindableControls";
import { removeVideoBinding, setVideoBinding } from "@/video/videoPatchSlice";

type Props = { moduleId: string; prop: string; schema: NumberProp };

export default function BindingControl({ moduleId, prop, schema }: Props) {
  const dispatch = useAppDispatch();
  const id = `${moduleId}:${prop}`;
  const binding = useAppSelector((state) =>
    state.videoPatch.bindings.find((b) => b.id === id),
  );
  const audioModules = useAppSelector(modulesSelector.selectAll);
  const controls = useMemo(() => bindableControls(audioModules), [audioModules]);

  const [control, setControl] = useState(binding?.control ?? "");
  const [range, setRange] = useState({
    inMin: binding?.inMin ?? 0,
    inMax: binding?.inMax ?? 1,
    outMin: binding?.outMin ?? schema.min,
    outMax: binding?.outMax ?? schema.max,
  });

  const choose = (next: string) => {
    const chosen = controls.find((c) => c.control === next);
    setControl(next);
    if (chosen) setRange((r) => ({ ...r, inMin: chosen.min, inMax: chosen.max }));
  };

  const save = () => {
    if (!control) return;
    dispatch(setVideoBinding({ id, moduleId, prop, control, ...range }));
  };

  const groups = ["Spectrum", "Audio"] as const;

  return (
    <Stack direction="row" align="center" gap={1}>
      {binding && (
        <Text size="xs" tone="muted" className="truncate">
          {controlLabel(controls, binding.control)}
        </Text>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <IconButton
            aria-label={`Bind ${schema.label}`}
            size="xs"
            variant="text"
            color={binding ? "primary" : "neutral"}
            icon={<Link2 className="h-3 w-3" />}
          />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bind {schema.label}</DialogTitle>
            <DialogDescription>
              Follow a spectrum band or an audio module prop.
            </DialogDescription>
          </DialogHeader>
          <Stack gap={3}>
            <Select value={control} onValueChange={choose}>
              <SelectTrigger aria-label="Control">
                <SelectValue placeholder="Choose a control" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {controls
                      .filter((c) => c.group === group)
                      .map((c) => (
                        <SelectItem key={c.control} value={c.control}>
                          {c.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Stack direction="row" gap={2}>
              {(["inMin", "inMax", "outMin", "outMax"] as const).map((key) => (
                <Stack key={key} gap={1}>
                  <Label htmlFor={`${id}-${key}`}>{key}</Label>
                  <Input
                    id={`${id}-${key}`}
                    type="number"
                    value={range[key]}
                    onChange={(event) => {
                      setRange((r) => ({ ...r, [key]: Number(event.target.value) }));
                    }}
                  />
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" gap={2}>
              <Button color="primary" onClick={save} disabled={!control}>
                Save
              </Button>
              {binding && (
                <Button
                  variant="text"
                  color="neutral"
                  onClick={() => {
                    dispatch(removeVideoBinding(id));
                    setControl("");
                  }}
                >
                  Unlink
                </Button>
              )}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
```
Check the exact `Select` API in `packages/ui/src` before writing; the
names above are the ones `packages/ui/src/index.ts` exports. If `Text` has
no `tone` prop, use the class the grid uses for muted text elsewhere. If
`IconButton` has no `primary` color, use the same color audio nodes use for
the settings button and show the bound state with the label only.

**Step 5: Mount it in VideoField**

In the number branch of `VideoField.tsx`, render
`<BindingControl moduleId={moduleId} prop={prop} schema={schema} />` under
the `InputField`.

**Step 6: Live value note**

The design said a bound prop's slider follows the live value. That needs
the worker to report effective props each frame. Leave it out: the slider
shows the stored value and the label shows the control. Edit the design
doc sentence to "A bound prop shows its control name under the slider"
and add a `// ponytail: slider shows the stored value; a per-frame values
message from the worker if following the live value matters` comment in
`BindingControl.tsx`.

**Step 7: Run tests, checks, browser, commit**

Run from `apps/grid`: `CI=1 pnpm test && pnpm tsc && pnpm lint && pnpm format`
Expected: all pass.

Browser: with Source, Hue Rotate and Visuals cabled and a Spectrum module
fed by the synth, bind Hue Rotate's amount to the Spectrum's low band with
out range 0 to 360. Expected: playing notes shifts the hue in the preview
and projector; Unlink stops it; deleting the Spectrum module clears the
label.

```bash
git add apps/grid/src/video/bindableControls.ts apps/grid/src/components/VideoModule apps/grid/test/video/bindableControls.test.ts docs/plans/2026-09-05-video-patch-editor-design.md
git commit -m "feat(grid): bind video props to spectrum bands and audio props

The picker lists controls the host can actually deliver: bands per
Spectrum module in the patch and bounded numeric props of audio modules.
Ranges default to the control's natural range and the prop's schema."
```

---

### Task 7: Remove the instrument Visuals button, docs

**Files:**
- Delete: `apps/grid/src/components/Instruments/VisualsButton.tsx`
- Modify: `apps/grid/src/components/Instruments/InstrumentPerformance.tsx` (restore the single Back button as `backSlot`)
- Modify: `apps/grid/test/instruments/InstrumentPerformance.test.tsx` (remove the VisualsButton mock)
- Modify: `CLAUDE.md` (Key Slices: add `videoPatchSlice`; Visual Patching: nodes are audio or video modules)
- Modify: `docs/plans/2026-09-05-video-patch-editor-design.md` (Status: implemented)
- Modify: `docs/findings.md` (add: video nodes are skipped by copy and paste; add a "values" message when live-following bindings matter)

**Step 1: Remove the button and restore the test**

Delete the file, restore `backSlot` to the original single `Button`
(drop the fragment and the import), and delete the `vi.mock` for
`VisualsButton` in the test.

**Step 2: Docs**

Two lines in `CLAUDE.md`, the status line in the design doc, two entries in
`docs/findings.md`.

**Step 3: Full repo checks**

Run from the repo root: `pnpm tsc && pnpm lint && pnpm test && pnpm format:check`
Expected: all clean.

**Step 4: Commit**

```bash
git add apps/grid CLAUDE.md docs
git commit -m "feat(grid): projector opens from the Visuals node, not performance mode

An instrument runs from its own document, not a grid patch, so there was
no video patch for the performance-mode button to show."
```

---

## Done when

- `pnpm tsc && pnpm lint && pnpm test && pnpm format:check` pass at the root.
- The browser checks in Tasks 5 and 6 pass.
- Seven commits on `feat/video-patch-editor`, not pushed.
