# Video Engine Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A new `@blibliki/video-engine` package that runs a module graph of
WebGL2 shader passes inside a Web Worker, renders to a projector window, and
reacts to the audio engine's patch props and spectrum.

**Architecture:** The worker owns a `VideoEngine` (modules, routes, control
bindings) and a `Renderer` (WebGL2 on an `OffscreenCanvas`). Graph
evaluation is pure (modules + routes in, ordered render passes out) and is
what the node tests cover. A thin `VideoEngineHost` on the main thread opens
the projector window, transfers its canvas, mirrors the audio engine's props
into named controls, and streams analyser bins each frame. Design:
`docs/plans/2026-09-03-video-engine-design.md`.

**Tech Stack:** TypeScript, WebGL2, Web Worker + OffscreenCanvas, vitest
(node environment), tsdown, pnpm workspace. No runtime dependencies beyond
`@blibliki/utils`.

---

## Conventions for every task

- Work in the worktree `.worktrees/feat/62-bootstrap-video-engine-package`
  on branch `feat/62-bootstrap-video-engine-package`.
- Run package commands from `packages/video-engine` unless stated.
- Tests: `pnpm test --run <file>` (vitest, node environment, no GPU).
- Before each commit: `pnpm tsc && pnpm lint && pnpm format` in the package.
- Commit messages explain why, end with the session trailer:
  `Claude-Session: https://claude.ai/code/session_01GCNtALRctAK5QHfpj3p3Qo`
- Comments: only for a workaround, an outside constraint, or a marked
  simplification (`// ponytail: ...`).
- No em dashes anywhere.

Plain-language glossary for someone new to the repo:

- **Module**: one node in the graph. Has an id, a type, props (its knobs).
- **Route**: a wire from one module's output to another module's input.
- **Control**: a named number that changes every frame (a mirrored audio
  knob, or a spectrum band). A **binding** maps one control onto one prop.
- **Render pass**: one shader draw. The graph becomes an ordered list of them.

---

### Task 1: Package skeleton

**Files:**
- Create: `packages/video-engine/package.json`
- Create: `packages/video-engine/tsconfig.json`
- Create: `packages/video-engine/tsdown.config.ts`
- Create: `packages/video-engine/vitest.config.ts`
- Create: `packages/video-engine/eslint.config.js`
- Create: `packages/video-engine/README.md`
- Create: `packages/video-engine/src/index.ts`
- Create: `packages/video-engine/test/smoke.test.ts`

**Step 1: Create package.json**

```json
{
  "name": "@blibliki/video-engine",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./worker": {
      "types": "./dist/worker.d.ts",
      "import": "./dist/worker.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["README.md", "src", "dist"],
  "scripts": {
    "build": "tsdown",
    "clean:dist": "rm -rf ./dist",
    "dev": "tsdown --watch --no-clean",
    "lint": "eslint src test",
    "test": "vitest",
    "tsc": "tsc --noEmit",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "bump": "npm version patch",
    "release": "pnpm run build && pnpm publish --access public"
  },
  "dependencies": {
    "@blibliki/utils": "workspace:^"
  },
  "devDependencies": {
    "vite-tsconfig-paths": "catalog:vite",
    "vitest": "catalog:test"
  }
}
```

**Step 2: Create tsconfig.json, tsdown.config.ts, vitest.config.ts, eslint.config.js**

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

`tsdown.config.ts` (two entries: the library and the worker):
```ts
import { defineConfig } from "tsdown";
import baseConfig from "../../tsdown.config.ts";

export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts"],
  ...baseConfig,
});
```

`vitest.config.ts`:
```ts
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
});
```

`eslint.config.js`:
```js
import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";

export default defineConfig([baseConfig]);
```

`README.md`:
```markdown
# @blibliki/video-engine

A module graph of WebGL2 shader passes that runs in a Web Worker and renders
to a projector window. Reacts to the audio engine's patch props and spectrum.

Design: `docs/plans/2026-09-03-video-engine-design.md` in the monorepo.
```

**Step 3: Create a placeholder entry and a smoke test**

`src/index.ts`:
```ts
export const VIDEO_ENGINE = "video-engine";
```

`test/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { VIDEO_ENGINE } from "@/index";

describe("package", () => {
  it("resolves the @/ alias", () => {
    expect(VIDEO_ENGINE).toBe("video-engine");
  });
});
```

**Step 4: Install and run every check**

Run from the repo root: `pnpm install`
Expected: lockfile updated with the new workspace package, no errors.

Run from `packages/video-engine`: `pnpm test --run && pnpm tsc && pnpm lint && pnpm format:check`
Expected: 1 test passes, tsc clean, lint clean, prettier clean.

**Step 5: Commit**

```bash
git add packages/video-engine pnpm-lock.yaml
git commit -m "feat(video-engine): package skeleton

New workspace package for the video engine (#62). Two build entries
because the worker must be bundled separately from the library the host
imports."
```

The placeholder export and smoke test are replaced in Task 2.

---

### Task 2: Prop schema and module base

**Files:**
- Create: `packages/video-engine/src/core/schema.ts`
- Create: `packages/video-engine/src/core/Module.ts`
- Create: `packages/video-engine/src/modules/index.ts`
- Create: `packages/video-engine/src/modules/Source.ts`
- Modify: `packages/video-engine/src/index.ts`
- Delete: `packages/video-engine/test/smoke.test.ts`
- Test: `packages/video-engine/test/core/Module.test.ts`

The schema types are copied from `packages/engine/src/core/schema.ts` so
the worker bundle never imports Web Audio code. If they stay identical,
lifting them to `@blibliki/utils` is a later change (see Task 9).

**Step 1: Write the failing test**

`test/core/Module.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";

describe("VideoModule", () => {
  it("merges defaults with given props and serializes", () => {
    const source = createModule({
      name: "src",
      moduleType: VideoModuleType.Source,
      props: { hue: 120 },
    });

    expect(source.props).toEqual({
      mode: "solid",
      hue: 120,
      saturation: 1,
      lightness: 0.5,
      spread: 180,
    });
    expect(source.serialize()).toEqual({
      id: source.id,
      name: "src",
      moduleType: VideoModuleType.Source,
      props: source.props,
    });
    expect(source.inputs).toEqual([]);
  });

  it("keeps a given id", () => {
    const source = createModule({
      id: "fixed",
      name: "src",
      moduleType: VideoModuleType.Source,
      props: {},
    });

    expect(source.id).toBe("fixed");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/core/Module.test.ts`
Expected: FAIL, cannot resolve `@/modules`.

**Step 3: Write the schema types**

`src/core/schema.ts` (copy of the engine's, types only):
```ts
import { EmptyObject } from "@blibliki/utils";

type BasePropType = {
  label: string;
  shortLabel: string;
  description?: string;
};

export type NumberProp = BasePropType & {
  kind: "number";
  min: number;
  max: number;
  step?: number;
  exp?: number;
};

export type EnumProp<T extends string | number> = BasePropType & {
  kind: "enum";
  options: T[];
};

export type StringProp = BasePropType & {
  kind: "string";
  pattern?: RegExp;
};

export type BooleanProp = BasePropType & {
  kind: "boolean";
};

export type ArrayProp = BasePropType & {
  kind: "array";
};

export type PropSchema =
  | NumberProp
  | EnumProp<string>
  | EnumProp<number>
  | StringProp
  | BooleanProp
  | ArrayProp;

type PrimarySchemaForType<T> = T extends boolean
  ? BooleanProp
  : T extends string
    ? StringProp
    : T extends number
      ? NumberProp
      : T extends unknown[]
        ? ArrayProp
        : never;

export type ModulePropSchema<
  T,
  TOverrides extends Partial<Record<keyof T, PropSchema>> = EmptyObject,
> = {
  [K in keyof T]: K extends keyof TOverrides
    ? TOverrides[K]
    : PrimarySchemaForType<T[K]>;
};
```

**Step 4: Write the module base**

`src/core/Module.ts`:
```ts
import { Optional, uuidv4 } from "@blibliki/utils";
import type { VideoModuleType, VideoPropsMapping } from "@/modules";
import type { ModulePropSchema } from "./schema";

export type IVideoModule<T extends VideoModuleType = VideoModuleType> = {
  id: string;
  name: string;
  moduleType: T;
  props: VideoPropsMapping[T];
};

export type ICreateVideoModule<T extends VideoModuleType = VideoModuleType> =
  Optional<IVideoModule<T>, "id" | "props"> & {
    props?: Partial<VideoPropsMapping[T]>;
  };

export abstract class VideoModule<
  T extends VideoModuleType = VideoModuleType,
> {
  readonly id: string;
  name: string;
  readonly moduleType: T;
  props: VideoPropsMapping[T];

  // Texture inputs, in the order the shader's u_<name> samplers expect.
  abstract readonly inputs: readonly string[];
  abstract readonly schema: ModulePropSchema<VideoPropsMapping[T]>;

  constructor(
    moduleType: T,
    defaults: VideoPropsMapping[T],
    params: ICreateVideoModule<T>,
  ) {
    this.id = params.id ?? uuidv4();
    this.name = params.name;
    this.moduleType = moduleType;
    this.props = { ...defaults, ...params.props };
  }

  updateProps(props: Partial<VideoPropsMapping[T]>) {
    this.props = { ...this.props, ...props };
  }

  serialize(): IVideoModule<T> {
    return {
      id: this.id,
      name: this.name,
      moduleType: this.moduleType,
      props: this.props,
    };
  }
}
```

**Step 5: Write the Source module and the registry**

`src/modules/Source.ts`:
```ts
import {
  ICreateVideoModule,
  VideoModule,
} from "@/core/Module";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type SourceMode = "solid" | "gradient";

export type ISourceProps = {
  mode: SourceMode;
  hue: number;
  saturation: number;
  lightness: number;
  spread: number;
};

const DEFAULT_PROPS: ISourceProps = {
  mode: "solid",
  hue: 0,
  saturation: 1,
  lightness: 0.5,
  spread: 180,
};

export const sourcePropSchema: ModulePropSchema<
  ISourceProps,
  { mode: EnumProp<SourceMode> }
> = {
  mode: {
    kind: "enum",
    options: ["solid", "gradient"],
    label: "Mode",
    shortLabel: "mode",
  },
  hue: { kind: "number", min: 0, max: 360, step: 1, label: "Hue", shortLabel: "hue" },
  saturation: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Saturation",
    shortLabel: "sat",
  },
  lightness: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Lightness",
    shortLabel: "light",
  },
  spread: {
    kind: "number",
    min: 0,
    max: 360,
    step: 1,
    label: "Hue spread",
    shortLabel: "spread",
  },
};

export default class Source extends VideoModule<VideoModuleType.Source> {
  readonly inputs = [] as const;
  readonly schema = sourcePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Source>) {
    super(VideoModuleType.Source, DEFAULT_PROPS, params);
  }
}
```

`src/modules/index.ts`:
```ts
import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import Source, { ISourceProps } from "./Source";

export enum VideoModuleType {
  Source = "Source",
  HueRotate = "HueRotate",
  Merge = "Merge",
  Overlay = "Overlay",
  Output = "Output",
}

export type VideoPropsMapping = {
  [VideoModuleType.Source]: ISourceProps;
  [VideoModuleType.HueRotate]: never;
  [VideoModuleType.Merge]: never;
  [VideoModuleType.Overlay]: never;
  [VideoModuleType.Output]: never;
};

export function createModule<T extends VideoModuleType>(
  params: ICreateVideoModule<T>,
): VideoModule {
  const type: VideoModuleType = params.moduleType;
  switch (type) {
    case VideoModuleType.Source:
      return new Source(params as ICreateVideoModule<VideoModuleType.Source>);
    case VideoModuleType.HueRotate:
    case VideoModuleType.Merge:
    case VideoModuleType.Overlay:
    case VideoModuleType.Output:
      throw new Error(`Module type not implemented yet: ${type}`);
    default:
      return assertNever(type);
  }
}

export { Source };
export type { ISourceProps, SourceMode } from "./Source";
```

The `never` mappings are filled in by Task 5. `assertNever` is exported by
`@blibliki/utils`.

`src/index.ts` (replace the placeholder):
```ts
export { VideoModule } from "./core/Module";
export type { ICreateVideoModule, IVideoModule } from "./core/Module";
export type { ModulePropSchema, PropSchema } from "./core/schema";
export { createModule, VideoModuleType } from "./modules";
export type { VideoPropsMapping } from "./modules";
```

Delete `test/smoke.test.ts`.

**Step 6: Run tests and checks**

Run: `pnpm test --run test/core/Module.test.ts && pnpm tsc && pnpm lint`
Expected: 2 tests pass, tsc and lint clean. If tsc complains about the
`params as ...` cast, keep it: the switch narrows `type`, not `params`.

**Step 7: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): prop schema and module base

Mirrors the audio engine's module shape (id, name, moduleType, props,
schema) without extending it: the audio Module imports Engine, Context and
MIDI, none of which belong in the worker bundle. Schema types are copied
for the same reason."
```

---

### Task 3: Routes and pure graph evaluation

**Files:**
- Create: `packages/video-engine/src/core/Routes.ts`
- Create: `packages/video-engine/src/core/graph.ts`
- Modify: `packages/video-engine/src/index.ts`
- Test: `packages/video-engine/test/core/Routes.test.ts`
- Test: `packages/video-engine/test/core/graph.test.ts`

Graph tests need modules with inputs, which don't exist until Task 5. Use
a tiny stub module in the test file so this task stays self-contained.

**Step 1: Write the failing Routes test**

`test/core/Routes.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Routes } from "@/core/Routes";

describe("Routes", () => {
  it("adds a route with a generated id", () => {
    const routes = new Routes();
    const route = routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(route.id).toBeTypeOf("string");
    expect(routes.serialize()).toEqual([route]);
  });

  it("replaces a route into an occupied input", () => {
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });
    const second = routes.addRoute({
      source: { moduleId: "c", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(routes.serialize()).toEqual([second]);
  });

  it("removes every route touching a module", () => {
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });
    const kept = routes.addRoute({
      source: { moduleId: "c", ioName: "out" },
      destination: { moduleId: "d", ioName: "in" },
    });

    routes.removeForModule("a");

    expect(routes.serialize()).toEqual([kept]);
  });

  it("finds the source plugged into an input", () => {
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "a", ioName: "out" },
      destination: { moduleId: "b", ioName: "in" },
    });

    expect(routes.sourceFor("b", "in")).toBe("a");
    expect(routes.sourceFor("b", "other")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/core/Routes.test.ts`
Expected: FAIL, cannot resolve `@/core/Routes`.

**Step 3: Write Routes**

`src/core/Routes.ts`:
```ts
import { Optional, uuidv4 } from "@blibliki/utils";

export type IPlug = {
  moduleId: string;
  ioName: string;
};

export type IRoute = {
  id: string;
  source: IPlug;
  destination: IPlug;
};

export class Routes {
  private routes = new Map<string, IRoute>();

  // One texture per input: a new route into an occupied input replaces it.
  addRoute(props: Optional<IRoute, "id">): IRoute {
    const { moduleId, ioName } = props.destination;
    for (const [id, route] of this.routes) {
      if (
        route.destination.moduleId === moduleId &&
        route.destination.ioName === ioName
      ) {
        this.routes.delete(id);
      }
    }

    const route = { ...props, id: props.id ?? uuidv4() };
    this.routes.set(route.id, route);

    return route;
  }

  removeRoute(id: string) {
    this.routes.delete(id);
  }

  removeForModule(moduleId: string) {
    for (const [id, route] of this.routes) {
      if (
        route.source.moduleId === moduleId ||
        route.destination.moduleId === moduleId
      ) {
        this.routes.delete(id);
      }
    }
  }

  sourceFor(moduleId: string, ioName: string): string | null {
    for (const route of this.routes.values()) {
      if (
        route.destination.moduleId === moduleId &&
        route.destination.ioName === ioName
      ) {
        return route.source.moduleId;
      }
    }

    return null;
  }

  clear() {
    this.routes.clear();
  }

  serialize(): IRoute[] {
    return Array.from(this.routes.values());
  }
}
```

**Step 4: Run Routes tests**

Run: `pnpm test --run test/core/Routes.test.ts`
Expected: 4 tests pass.

**Step 5: Write the failing graph test**

`test/core/graph.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildPasses } from "@/core/graph";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { Routes } from "@/core/Routes";
import { VideoModuleType } from "@/modules";

// Stub: a module whose type and inputs are chosen per test. Real modules
// arrive in Task 5; the graph only needs ids, types, inputs and props.
class Stub extends VideoModule<VideoModuleType.Source> {
  readonly inputs: readonly string[];
  readonly schema = {
    mode: { kind: "enum", options: ["solid", "gradient"], label: "", shortLabel: "" },
    hue: { kind: "number", min: 0, max: 360, label: "", shortLabel: "" },
    saturation: { kind: "number", min: 0, max: 1, label: "", shortLabel: "" },
    lightness: { kind: "number", min: 0, max: 1, label: "", shortLabel: "" },
    spread: { kind: "number", min: 0, max: 360, label: "", shortLabel: "" },
  } as const;

  constructor(
    id: string,
    inputs: readonly string[],
    moduleType: VideoModuleType = VideoModuleType.Source,
  ) {
    const params = {
      id,
      name: id,
      moduleType: VideoModuleType.Source,
      props: {},
    } satisfies ICreateVideoModule<VideoModuleType.Source>;
    super(VideoModuleType.Source, {
      mode: "solid",
      hue: 0,
      saturation: 1,
      lightness: 0.5,
      spread: 180,
    }, params);
    this.inputs = inputs;
    // The registry is not involved here, so override the type by hand.
    (this as { moduleType: VideoModuleType }).moduleType = moduleType;
  }
}

function graph(modules: Stub[]) {
  return new Map(modules.map((m) => [m.id, m as VideoModule]));
}

describe("buildPasses", () => {
  it("orders passes so inputs come before consumers, output last", () => {
    const src = new Stub("src", []);
    const fx = new Stub("fx", ["in"], VideoModuleType.HueRotate);
    const out = new Stub("out", ["in"], VideoModuleType.Output);
    const routes = new Routes();
    routes.addRoute({
      source: { moduleId: "src", ioName: "out" },
      destination: { moduleId: "fx", ioName: "in" },
    });
    routes.addRoute({
      source: { moduleId: "fx", ioName: "out" },
      destination: { moduleId: "out", ioName: "in" },
    });

    const passes = buildPasses(graph([out, fx, src]), routes, (m) => m.props);

    expect(passes.map((p) => p.moduleId)).toEqual(["src", "fx", "out"]);
    expect(passes[1]?.inputs).toEqual({ in: "src" });
    expect(passes[0]?.uniforms).toEqual({
      mode: 0,
      hue: 0,
      saturation: 1,
      lightness: 0.5,
      spread: 180,
    });
  });

  it("maps a missing input to null and skips modules not reaching an output", () => {
    const out = new Stub("out", ["in"], VideoModuleType.Output);
    const orphan = new Stub("orphan", []);

    const passes = buildPasses(graph([out, orphan]), new Routes(), (m) => m.props);

    expect(passes.map((p) => p.moduleId)).toEqual(["out"]);
    expect(passes[0]?.inputs).toEqual({ in: null });
  });

  it("returns no passes without an output module", () => {
    expect(buildPasses(graph([new Stub("src", [])]), new Routes(), (m) => m.props)).toEqual([]);
  });

  it("throws on a cycle", () => {
    const a = new Stub("a", ["in"], VideoModuleType.HueRotate);
    const b = new Stub("b", ["in"], VideoModuleType.HueRotate);
    const out = new Stub("out", ["in"], VideoModuleType.Output);
    const routes = new Routes();
    routes.addRoute({ source: { moduleId: "a", ioName: "out" }, destination: { moduleId: "b", ioName: "in" } });
    routes.addRoute({ source: { moduleId: "b", ioName: "out" }, destination: { moduleId: "a", ioName: "in" } });
    routes.addRoute({ source: { moduleId: "b", ioName: "out" }, destination: { moduleId: "out", ioName: "in" } });

    expect(() => buildPasses(graph([a, b, out]), routes, (m) => m.props)).toThrow(/cycle/);
  });

  it("uses the resolved props, not the stored ones", () => {
    const src = new Stub("src", []);
    const out = new Stub("out", ["in"], VideoModuleType.Output);
    const routes = new Routes();
    routes.addRoute({ source: { moduleId: "src", ioName: "out" }, destination: { moduleId: "out", ioName: "in" } });

    const passes = buildPasses(graph([src, out]), routes, (m) => ({ ...m.props, hue: 90 }));

    expect(passes[0]?.uniforms.hue).toBe(90);
  });
});
```

**Step 6: Run test to verify it fails**

Run: `pnpm test --run test/core/graph.test.ts`
Expected: FAIL, cannot resolve `@/core/graph`.

**Step 7: Write graph.ts**

`src/core/graph.ts`:
```ts
import { VideoModuleType } from "@/modules";
import { VideoModule } from "./Module";
import { Routes } from "./Routes";
import { PropSchema } from "./schema";

export type RenderPass = {
  moduleId: string;
  moduleType: VideoModuleType;
  // Texture input name to the module id feeding it, or null when unplugged.
  inputs: Record<string, string | null>;
  // Numeric uniforms, one per prop the shader can use. Prefixed u_ by the renderer.
  uniforms: Record<string, number>;
};

export type ResolveProps = (module: VideoModule) => Record<string, unknown>;

export function uniformsFor(
  props: Record<string, unknown>,
  schema: Record<string, PropSchema>,
): Record<string, number> {
  const uniforms: Record<string, number> = {};

  for (const [key, prop] of Object.entries(schema)) {
    const value = props[key];
    if (prop.kind === "number" && typeof value === "number") {
      uniforms[key] = value;
    } else if (prop.kind === "boolean") {
      uniforms[key] = value ? 1 : 0;
    } else if (prop.kind === "enum") {
      const options: (string | number)[] = prop.options;
      uniforms[key] = Math.max(0, options.indexOf(value as string | number));
    }
  }

  return uniforms;
}

export function buildPasses(
  modules: Map<string, VideoModule>,
  routes: Routes,
  resolveProps: ResolveProps,
): RenderPass[] {
  const passes: RenderPass[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  const visit = (id: string) => {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`Video graph has a cycle at ${id}`);
    const module = modules.get(id);
    if (!module) return;

    visiting.add(id);
    const inputs: Record<string, string | null> = {};
    for (const ioName of module.inputs) {
      const sourceId = routes.sourceFor(id, ioName);
      inputs[ioName] = sourceId;
      if (sourceId !== null) visit(sourceId);
    }
    visiting.delete(id);
    done.add(id);

    passes.push({
      moduleId: id,
      moduleType: module.moduleType,
      inputs,
      uniforms: uniformsFor(
        resolveProps(module),
        module.schema as Record<string, PropSchema>,
      ),
    });
  };

  for (const module of modules.values()) {
    if (module.moduleType === VideoModuleType.Output) visit(module.id);
  }

  return passes;
}
```

Add to `src/index.ts`:
```ts
export { Routes } from "./core/Routes";
export type { IPlug, IRoute } from "./core/Routes";
export { buildPasses } from "./core/graph";
export type { RenderPass } from "./core/graph";
```

**Step 8: Run tests and checks**

Run: `pnpm test --run && pnpm tsc && pnpm lint`
Expected: all tests pass, tsc and lint clean. If lint rejects the
`(this as { moduleType })` write in the stub, add
`// eslint-disable-next-line` for that one line with the rule it names; the
stub goes away when Task 5 lands real modules and the test is rewritten.

**Step 9: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): routes and pure graph evaluation

The graph is evaluated into an ordered pass list without a GPU, so this is
the part node tests can cover. Unplugged inputs stay null and are drawn as
black by the renderer; a route into an occupied input replaces the old one
because a shader sampler can only read one texture."
```

---

### Task 4: Controls and bindings

**Files:**
- Create: `packages/video-engine/src/core/controls.ts`
- Modify: `packages/video-engine/src/index.ts`
- Test: `packages/video-engine/test/core/controls.test.ts`

**Step 1: Write the failing test**

`test/core/controls.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  applyBindings,
  IBinding,
  mapRange,
  spectrumToControls,
} from "@/core/controls";

describe("mapRange", () => {
  it("maps and clamps", () => {
    expect(mapRange(5, 0, 10, 0, 360)).toBe(180);
    expect(mapRange(-1, 0, 10, 0, 360)).toBe(0);
    expect(mapRange(11, 0, 10, 0, 360)).toBe(360);
    expect(mapRange(0.5, 0, 1, 360, 0)).toBe(180);
  });

  it("returns outMin for a zero-width input range", () => {
    expect(mapRange(3, 2, 2, 10, 20)).toBe(10);
  });
});

describe("applyBindings", () => {
  const binding: IBinding = {
    id: "b1",
    moduleId: "m",
    prop: "hue",
    control: "spectrum:low",
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 360,
  };

  it("overrides a prop from a control value", () => {
    const props = applyBindings({ hue: 10, spread: 1 }, [binding], new Map([["spectrum:low", 0.5]]));

    expect(props).toEqual({ hue: 180, spread: 1 });
  });

  it("keeps the stored prop when the control has no value yet", () => {
    const props = applyBindings({ hue: 10 }, [binding], new Map());

    expect(props).toEqual({ hue: 10 });
  });
});

describe("spectrumToControls", () => {
  it("splits bins into three bands and a level, normalized 0..1", () => {
    const bins = new Float32Array([-30, -30, -100, -100, -65, -65]);

    expect(spectrumToControls(bins)).toEqual({
      "spectrum:low": 1,
      "spectrum:mid": 0,
      "spectrum:high": 0.5,
      "spectrum:level": 0.5,
    });
  });

  it("treats silence (-Infinity) as zero", () => {
    const bins = new Float32Array(6).fill(-Infinity);

    expect(spectrumToControls(bins)["spectrum:level"]).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/core/controls.test.ts`
Expected: FAIL, cannot resolve `@/core/controls`.

**Step 3: Write controls.ts**

`src/core/controls.ts`:
```ts
export type IBinding = {
  id: string;
  moduleId: string;
  prop: string;
  control: string;
  inMin: number;
  inMax: number;
  outMin: number;
  outMax: number;
};

export type ControlValues = ReadonlyMap<string, number>;

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));

  return outMin + t * (outMax - outMin);
}

export function applyBindings<P extends Record<string, unknown>>(
  props: P,
  bindings: readonly IBinding[],
  controls: ControlValues,
): P {
  let result = props;

  for (const binding of bindings) {
    const value = controls.get(binding.control);
    if (value === undefined) continue;
    result = {
      ...result,
      [binding.prop]: mapRange(
        value,
        binding.inMin,
        binding.inMax,
        binding.outMin,
        binding.outMax,
      ),
    };
  }

  return result;
}

// ponytail: three fixed bands by bin index; a configurable band table when a
// patch needs a specific frequency range.
export function spectrumToControls(
  bins: Float32Array,
  minDb = -100,
  maxDb = -30,
): Record<string, number> {
  const normalized = Array.from(bins, (db) =>
    Math.min(1, Math.max(0, (db - minDb) / (maxDb - minDb))),
  );
  const third = Math.max(1, Math.floor(normalized.length / 3));
  const mean = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

  return {
    "spectrum:low": mean(normalized.slice(0, third)),
    "spectrum:mid": mean(normalized.slice(third, third * 2)),
    "spectrum:high": mean(normalized.slice(third * 2)),
    "spectrum:level": mean(normalized),
  };
}
```

Add to `src/index.ts`:
```ts
export { applyBindings, mapRange, spectrumToControls } from "./core/controls";
export type { ControlValues, IBinding } from "./core/controls";
```

**Step 4: Run tests and checks**

Run: `pnpm test --run test/core/controls.test.ts && pnpm tsc && pnpm lint`
Expected: 6 tests pass, checks clean. Note `-Infinity - minDb` is
`-Infinity`, which clamps to 0, so the silence test passes without a
special case.

**Step 5: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): control bus and bindings

Bindings are applied as an overlay when passes are built, never written
into the stored props, so a control that stops arriving leaves the module
at its last user-set value instead of snapping to zero."
```

---

### Task 5: The bootstrap module set

**Files:**
- Create: `packages/video-engine/src/modules/HueRotate.ts`
- Create: `packages/video-engine/src/modules/Merge.ts`
- Create: `packages/video-engine/src/modules/Overlay.ts`
- Create: `packages/video-engine/src/modules/Output.ts`
- Modify: `packages/video-engine/src/modules/index.ts`
- Modify: `packages/video-engine/test/core/graph.test.ts` (replace the stub with real modules)
- Test: `packages/video-engine/test/modules/modules.test.ts`

**Step 1: Write the failing test**

`test/modules/modules.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";

describe("bootstrap modules", () => {
  it.each([
    [VideoModuleType.Source, [], { mode: "solid", hue: 0, saturation: 1, lightness: 0.5, spread: 180 }],
    [VideoModuleType.HueRotate, ["in"], { amount: 0 }],
    [VideoModuleType.Merge, ["a", "b"], { mix: 0.5 }],
    [VideoModuleType.Overlay, ["base", "layer"], { opacity: 1 }],
    [VideoModuleType.Output, ["in"], {}],
  ])("%s has its inputs and default props", (moduleType, inputs, props) => {
    const module = createModule({ name: "m", moduleType });

    expect(module.inputs).toEqual(inputs);
    expect(module.props).toEqual(props);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/modules/modules.test.ts`
Expected: FAIL with "Module type not implemented yet: HueRotate".

**Step 3: Write the four modules**

`src/modules/HueRotate.ts`:
```ts
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IHueRotateProps = { amount: number };

const DEFAULT_PROPS: IHueRotateProps = { amount: 0 };

export const hueRotatePropSchema: ModulePropSchema<IHueRotateProps> = {
  amount: { kind: "number", min: 0, max: 360, step: 1, label: "Amount", shortLabel: "amt" },
};

export default class HueRotate extends VideoModule<VideoModuleType.HueRotate> {
  readonly inputs = ["in"] as const;
  readonly schema = hueRotatePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.HueRotate>) {
    super(VideoModuleType.HueRotate, DEFAULT_PROPS, params);
  }
}
```

`src/modules/Merge.ts`:
```ts
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IMergeProps = { mix: number };

const DEFAULT_PROPS: IMergeProps = { mix: 0.5 };

export const mergePropSchema: ModulePropSchema<IMergeProps> = {
  mix: { kind: "number", min: 0, max: 1, step: 0.01, label: "Mix", shortLabel: "mix" },
};

export default class Merge extends VideoModule<VideoModuleType.Merge> {
  readonly inputs = ["a", "b"] as const;
  readonly schema = mergePropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Merge>) {
    super(VideoModuleType.Merge, DEFAULT_PROPS, params);
  }
}
```

`src/modules/Overlay.ts`:
```ts
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IOverlayProps = { opacity: number };

const DEFAULT_PROPS: IOverlayProps = { opacity: 1 };

export const overlayPropSchema: ModulePropSchema<IOverlayProps> = {
  opacity: { kind: "number", min: 0, max: 1, step: 0.01, label: "Opacity", shortLabel: "opac" },
};

export default class Overlay extends VideoModule<VideoModuleType.Overlay> {
  readonly inputs = ["base", "layer"] as const;
  readonly schema = overlayPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Overlay>) {
    super(VideoModuleType.Overlay, DEFAULT_PROPS, params);
  }
}
```

`src/modules/Output.ts`:
```ts
import { EmptyObject } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IOutputProps = EmptyObject;

export const outputPropSchema: ModulePropSchema<IOutputProps> = {};

export default class Output extends VideoModule<VideoModuleType.Output> {
  readonly inputs = ["in"] as const;
  readonly schema = outputPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Output>) {
    super(VideoModuleType.Output, {}, params);
  }
}
```

**Step 4: Fill in the registry**

In `src/modules/index.ts`, replace the `never` mappings and the switch:
```ts
import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, VideoModule } from "@/core/Module";
import HueRotate, { IHueRotateProps } from "./HueRotate";
import Merge, { IMergeProps } from "./Merge";
import Output, { IOutputProps } from "./Output";
import Overlay, { IOverlayProps } from "./Overlay";
import Source, { ISourceProps } from "./Source";

export enum VideoModuleType {
  Source = "Source",
  HueRotate = "HueRotate",
  Merge = "Merge",
  Overlay = "Overlay",
  Output = "Output",
}

export type VideoPropsMapping = {
  [VideoModuleType.Source]: ISourceProps;
  [VideoModuleType.HueRotate]: IHueRotateProps;
  [VideoModuleType.Merge]: IMergeProps;
  [VideoModuleType.Overlay]: IOverlayProps;
  [VideoModuleType.Output]: IOutputProps;
};

export function createModule<T extends VideoModuleType>(
  params: ICreateVideoModule<T>,
): VideoModule {
  const type: VideoModuleType = params.moduleType;
  switch (type) {
    case VideoModuleType.Source:
      return new Source(params as ICreateVideoModule<VideoModuleType.Source>);
    case VideoModuleType.HueRotate:
      return new HueRotate(params as ICreateVideoModule<VideoModuleType.HueRotate>);
    case VideoModuleType.Merge:
      return new Merge(params as ICreateVideoModule<VideoModuleType.Merge>);
    case VideoModuleType.Overlay:
      return new Overlay(params as ICreateVideoModule<VideoModuleType.Overlay>);
    case VideoModuleType.Output:
      return new Output(params as ICreateVideoModule<VideoModuleType.Output>);
    default:
      return assertNever(type);
  }
}

export { HueRotate, Merge, Output, Overlay, Source };
export type { IHueRotateProps } from "./HueRotate";
export type { IMergeProps } from "./Merge";
export type { IOutputProps } from "./Output";
export type { IOverlayProps } from "./Overlay";
export type { ISourceProps, SourceMode } from "./Source";
```

**Step 5: Replace the stub in the graph test with real modules**

Rewrite `test/core/graph.test.ts` so each `new Stub(id, inputs, type)`
becomes `createModule({ id, name: id, moduleType: type })` with
`VideoModuleType.Source` for sources, `HueRotate` for the "fx", "a", "b"
modules and `Output` for outputs. Delete the `Stub` class and its
eslint-disable line. The `uniforms` expectation for the source pass and the
"uses the resolved props" test stay as they are: Source's real schema
produces the same uniforms the stub did.

**Step 6: Run tests and checks**

Run: `pnpm test --run && pnpm tsc && pnpm lint`
Expected: all tests pass (Module, Routes, graph, controls, modules), checks
clean.

**Step 7: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): bootstrap module set

Source, HueRotate, Merge, Overlay and Output: the minimum that exercises a
source, a one-input transform, two two-input combiners and a sink. Their
shaders arrive with the renderer."
```

---

### Task 6: VideoEngine (graph owner) and serialization

**Files:**
- Create: `packages/video-engine/src/VideoEngine.ts`
- Modify: `packages/video-engine/src/index.ts`
- Test: `packages/video-engine/test/VideoEngine.test.ts`

**Step 1: Write the failing test**

`test/VideoEngine.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { VideoModuleType } from "@/modules";
import { VideoEngine } from "@/VideoEngine";

function chain() {
  const engine = new VideoEngine();
  const src = engine.addModule({ id: "src", name: "src", moduleType: VideoModuleType.Source });
  const fx = engine.addModule({ id: "fx", name: "fx", moduleType: VideoModuleType.HueRotate });
  const out = engine.addModule({ id: "out", name: "out", moduleType: VideoModuleType.Output });
  engine.addRoute({ source: { moduleId: src.id, ioName: "out" }, destination: { moduleId: fx.id, ioName: "in" } });
  engine.addRoute({ source: { moduleId: fx.id, ioName: "out" }, destination: { moduleId: out.id, ioName: "in" } });

  return engine;
}

describe("VideoEngine", () => {
  it("builds passes for the chain", () => {
    expect(chain().passes().map((p) => p.moduleId)).toEqual(["src", "fx", "out"]);
  });

  it("applies bindings from controls when building passes", () => {
    const engine = chain();
    engine.setBinding({ id: "b", moduleId: "fx", prop: "amount", control: "spectrum:low", inMin: 0, inMax: 1, outMin: 0, outMax: 360 });
    engine.setControls({ "spectrum:low": 0.25 });

    expect(engine.passes()[1]?.uniforms.amount).toBe(90);
    expect(engine.findModule("fx").props).toEqual({ amount: 0 });
  });

  it("updates props", () => {
    const engine = chain();
    engine.updateProps("fx", { amount: 45 });

    expect(engine.findModule("fx").props).toEqual({ amount: 45 });
  });

  it("removing a module drops its routes and bindings", () => {
    const engine = chain();
    engine.setBinding({ id: "b", moduleId: "fx", prop: "amount", control: "x", inMin: 0, inMax: 1, outMin: 0, outMax: 1 });
    engine.removeModule("fx");

    expect(engine.serialize().routes).toEqual([]);
    expect(engine.serialize().bindings).toEqual([]);
    expect(engine.passes()[0]?.inputs).toEqual({ in: null });
  });

  it("round-trips through serialize and load", () => {
    const engine = chain();
    engine.setBinding({ id: "b", moduleId: "fx", prop: "amount", control: "x", inMin: 0, inMax: 1, outMin: 0, outMax: 1 });
    const patch = engine.serialize();

    const loaded = new VideoEngine();
    loaded.load(patch);

    expect(loaded.serialize()).toEqual(patch);
  });

  it("throws for an unknown module id", () => {
    expect(() => chain().findModule("nope")).toThrow(/nope/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/VideoEngine.test.ts`
Expected: FAIL, cannot resolve `@/VideoEngine`.

**Step 3: Write VideoEngine.ts**

```ts
import { Optional } from "@blibliki/utils";
import { applyBindings, IBinding } from "./core/controls";
import { buildPasses, RenderPass } from "./core/graph";
import { ICreateVideoModule, IVideoModule, VideoModule } from "./core/Module";
import { IRoute, Routes } from "./core/Routes";
import { createModule, VideoModuleType, VideoPropsMapping } from "./modules";

export type IVideoPatch = {
  modules: IVideoModule[];
  routes: IRoute[];
  bindings: IBinding[];
};

export class VideoEngine {
  readonly modules = new Map<string, VideoModule>();
  readonly routes = new Routes();
  readonly bindings = new Map<string, IBinding>();
  private controls = new Map<string, number>();

  addModule<T extends VideoModuleType>(params: ICreateVideoModule<T>): VideoModule {
    const module = createModule(params);
    this.modules.set(module.id, module);

    return module;
  }

  removeModule(id: string) {
    this.modules.delete(id);
    this.routes.removeForModule(id);
    for (const [bindingId, binding] of this.bindings) {
      if (binding.moduleId === id) this.bindings.delete(bindingId);
    }
  }

  findModule(id: string): VideoModule {
    const module = this.modules.get(id);
    if (!module) throw new Error(`Video module not found: ${id}`);

    return module;
  }

  updateProps<T extends VideoModuleType>(id: string, props: Partial<VideoPropsMapping[T]>) {
    (this.findModule(id) as VideoModule<T>).updateProps(props);
  }

  addRoute(route: Optional<IRoute, "id">): IRoute {
    this.findModule(route.source.moduleId);
    this.findModule(route.destination.moduleId);

    return this.routes.addRoute(route);
  }

  removeRoute(id: string) {
    this.routes.removeRoute(id);
  }

  setBinding(binding: IBinding) {
    this.findModule(binding.moduleId);
    this.bindings.set(binding.id, binding);
  }

  removeBinding(id: string) {
    this.bindings.delete(id);
  }

  setControls(values: Record<string, number>) {
    for (const [name, value] of Object.entries(values)) {
      this.controls.set(name, value);
    }
  }

  passes(): RenderPass[] {
    const bindings = Array.from(this.bindings.values());

    return buildPasses(this.modules, this.routes, (module) =>
      applyBindings(
        module.props as Record<string, unknown>,
        bindings.filter((b) => b.moduleId === module.id),
        this.controls,
      ),
    );
  }

  serialize(): IVideoPatch {
    return {
      modules: Array.from(this.modules.values()).map((m) => m.serialize()),
      routes: this.routes.serialize(),
      bindings: Array.from(this.bindings.values()),
    };
  }

  load(patch: IVideoPatch) {
    this.modules.clear();
    this.routes.clear();
    this.bindings.clear();
    patch.modules.forEach((m) => this.addModule(m));
    patch.routes.forEach((r) => this.addRoute(r));
    patch.bindings.forEach((b) => this.setBinding(b));
  }
}
```

Add to `src/index.ts`:
```ts
export { VideoEngine } from "./VideoEngine";
export type { IVideoPatch } from "./VideoEngine";
```

**Step 4: Run tests and checks**

Run: `pnpm test --run && pnpm tsc && pnpm lint`
Expected: all pass, checks clean. If tsc rejects `patch.modules.forEach((m) => this.addModule(m))` because `IVideoModule` is a union over types, change the call to `this.addModule(m as ICreateVideoModule)`.

**Step 5: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): VideoEngine owns modules, routes and bindings

Serializes to the same modules/routes shape as an audio patch plus a
bindings list, so the grid can reuse its node model later."
```

---

### Task 7: Protocol and worker message handling

**Files:**
- Create: `packages/video-engine/src/protocol.ts`
- Create: `packages/video-engine/src/handleMessage.ts`
- Modify: `packages/video-engine/src/index.ts`
- Test: `packages/video-engine/test/handleMessage.test.ts`

`handleMessage` covers every message that does not need a canvas, so it is
testable in node. `init`, `resize` and `detach` are handled in `worker.ts`
(Task 8) because they touch the renderer.

**Step 1: Write the failing test**

`test/handleMessage.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { handleMessage } from "@/handleMessage";
import { VideoModuleType } from "@/modules";
import { VideoEngine } from "@/VideoEngine";

describe("handleMessage", () => {
  it("applies a graph command and echoes the patch", () => {
    const engine = new VideoEngine();

    const out = handleMessage(engine, {
      type: "addModule",
      module: { id: "src", name: "src", moduleType: VideoModuleType.Source },
    });

    expect(engine.modules.has("src")).toBe(true);
    expect(out).toEqual([{ type: "patch", patch: engine.serialize() }]);
  });

  it("loads a patch", () => {
    const engine = new VideoEngine();
    const patch = { modules: [{ id: "o", name: "o", moduleType: VideoModuleType.Output, props: {} }], routes: [], bindings: [] };

    handleMessage(engine, { type: "load", patch });

    expect(engine.serialize()).toEqual(patch);
  });

  it("stores controls without echoing", () => {
    const engine = new VideoEngine();
    engine.addModule({ id: "fx", name: "fx", moduleType: VideoModuleType.HueRotate });
    engine.addModule({ id: "o", name: "o", moduleType: VideoModuleType.Output });
    engine.addRoute({ source: { moduleId: "fx", ioName: "out" }, destination: { moduleId: "o", ioName: "in" } });
    engine.setBinding({ id: "b", moduleId: "fx", prop: "amount", control: "patch:osc:frequency", inMin: 0, inMax: 1000, outMin: 0, outMax: 360 });

    const out = handleMessage(engine, { type: "controls", values: { "patch:osc:frequency": 500 } });

    expect(out).toEqual([]);
    expect(engine.passes()[0]?.uniforms.amount).toBe(180);
  });

  it("turns spectrum bins into controls and hands the buffer back", () => {
    const engine = new VideoEngine();
    const bins = new Float32Array([-30, -30, -30]);

    const out = handleMessage(engine, { type: "spectrum", bins });

    expect(out).toEqual([{ type: "spectrumBuffer", bins }]);
  });

  it("reports a thrown error instead of crashing", () => {
    const engine = new VideoEngine();

    const out = handleMessage(engine, { type: "removeModule", id: "x" });
    const bad = handleMessage(engine, { type: "updateProps", id: "missing", props: {} });

    expect(out[0]?.type).toBe("patch");
    expect(bad).toEqual([{ type: "error", message: "Video module not found: missing" }]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/handleMessage.test.ts`
Expected: FAIL, cannot resolve `@/handleMessage`.

**Step 3: Write protocol.ts**

```ts
import { Optional } from "@blibliki/utils";
import { IBinding } from "./core/controls";
import { ICreateVideoModule } from "./core/Module";
import { IRoute } from "./core/Routes";
import { IVideoPatch } from "./VideoEngine";

export type HostMessage =
  | { type: "init"; canvas: OffscreenCanvas; width: number; height: number }
  | { type: "resize"; width: number; height: number }
  | { type: "detach" }
  | { type: "load"; patch: IVideoPatch }
  | { type: "addModule"; module: ICreateVideoModule }
  | { type: "removeModule"; id: string }
  | { type: "updateProps"; id: string; props: Record<string, unknown> }
  | { type: "addRoute"; route: Optional<IRoute, "id"> }
  | { type: "removeRoute"; id: string }
  | { type: "setBinding"; binding: IBinding }
  | { type: "removeBinding"; id: string }
  | { type: "controls"; values: Record<string, number> }
  | { type: "spectrum"; bins: Float32Array };

export type WorkerMessage =
  | { type: "ready" }
  | { type: "patch"; patch: IVideoPatch }
  | { type: "spectrumBuffer"; bins: Float32Array }
  | { type: "error"; message: string };

export type GraphMessage = Exclude<
  HostMessage,
  { type: "init" } | { type: "resize" } | { type: "detach" }
>;
```

**Step 4: Write handleMessage.ts**

```ts
import { spectrumToControls } from "./core/controls";
import { GraphMessage, WorkerMessage } from "./protocol";
import { VideoEngine } from "./VideoEngine";

export function handleMessage(
  engine: VideoEngine,
  message: GraphMessage,
): WorkerMessage[] {
  try {
    switch (message.type) {
      case "controls":
        engine.setControls(message.values);
        return [];
      case "spectrum":
        engine.setControls(spectrumToControls(message.bins));
        return [{ type: "spectrumBuffer", bins: message.bins }];
      case "load":
        engine.load(message.patch);
        break;
      case "addModule":
        engine.addModule(message.module);
        break;
      case "removeModule":
        engine.removeModule(message.id);
        break;
      case "updateProps":
        engine.updateProps(message.id, message.props);
        break;
      case "addRoute":
        engine.addRoute(message.route);
        break;
      case "removeRoute":
        engine.removeRoute(message.id);
        break;
      case "setBinding":
        engine.setBinding(message.binding);
        break;
      case "removeBinding":
        engine.removeBinding(message.id);
        break;
    }

    return [{ type: "patch", patch: engine.serialize() }];
  } catch (error) {
    return [{ type: "error", message: error instanceof Error ? error.message : String(error) }];
  }
}
```

Add to `src/index.ts`:
```ts
export type { GraphMessage, HostMessage, WorkerMessage } from "./protocol";
export { handleMessage } from "./handleMessage";
```

**Step 5: Run tests and checks**

Run: `pnpm test --run && pnpm tsc && pnpm lint`
Expected: all pass, checks clean. If lint wants an exhaustive `default` on
the switch, add `default: assertNever(message)` from `@blibliki/utils`.

**Step 6: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): host/worker protocol and message handler

One discriminated union both sides import. The handler is a pure function
of the engine so the protocol is covered in node; only canvas-bound
messages stay in the worker entry."
```

---

### Task 8: WebGL2 renderer and the worker entry

No node test for this task: it needs a GPU. Verification is in the browser
in Task 10. Keep the renderer to the pass list contract from Task 3.

**Files:**
- Create: `packages/video-engine/src/render/shaders.ts`
- Create: `packages/video-engine/src/render/Renderer.ts`
- Create: `packages/video-engine/src/worker.ts`

**Step 1: Write shaders.ts**

Every fragment shader gets `v_uv` from the shared vertex shader, its
texture inputs as `u_<inputName>` samplers, and its numeric props as
`u_<prop>` floats (enum props arrive as their option index).

```ts
import { VideoModuleType } from "@/modules";

export const VERTEX = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
`;

const HSL = `
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}`;

export const FRAGMENT: Record<VideoModuleType, string> = {
  [VideoModuleType.Source]: `${HEADER}
uniform float u_mode, u_hue, u_saturation, u_lightness, u_spread;
${HSL}
void main() {
  float hue = u_hue + (u_mode > 0.5 ? v_uv.x * u_spread : 0.0);
  outColor = vec4(hsl2rgb(vec3(fract(hue / 360.0), u_saturation, u_lightness)), 1.0);
}`,

  [VideoModuleType.HueRotate]: `${HEADER}
uniform sampler2D u_in;
uniform float u_amount;
void main() {
  vec4 c = texture(u_in, v_uv);
  float a = radians(u_amount);
  mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c.rgb;
  vec3 rotated = vec3(yiq.x, yiq.y * cos(a) - yiq.z * sin(a), yiq.y * sin(a) + yiq.z * cos(a));
  outColor = vec4(clamp(toRGB * rotated, 0.0, 1.0), c.a);
}`,

  [VideoModuleType.Merge]: `${HEADER}
uniform sampler2D u_a, u_b;
uniform float u_mix;
void main() {
  outColor = mix(texture(u_a, v_uv), texture(u_b, v_uv), u_mix);
}`,

  [VideoModuleType.Overlay]: `${HEADER}
uniform sampler2D u_base, u_layer;
uniform float u_opacity;
void main() {
  vec4 base = texture(u_base, v_uv);
  vec4 layer = texture(u_layer, v_uv);
  outColor = vec4(mix(base.rgb, layer.rgb, layer.a * u_opacity), 1.0);
}`,

  [VideoModuleType.Output]: `${HEADER}
uniform sampler2D u_in;
void main() {
  outColor = texture(u_in, v_uv);
}`,
};
```

**Step 2: Write Renderer.ts**

```ts
import { RenderPass } from "@/core/graph";
import { VideoModuleType } from "@/modules";
import { FRAGMENT, VERTEX } from "./shaders";

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

export class Renderer {
  private gl: WebGL2RenderingContext;
  private programs = new Map<VideoModuleType, WebGLProgram>();
  private targets = new Map<string, Target>();
  private black!: WebGLTexture;

  constructor(private canvas: OffscreenCanvas) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 is not available in this worker");
    this.gl = gl;

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.setup();
    });

    this.setup();
  }

  resize(width: number, height: number) {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeTargets();
  }

  render(passes: RenderPass[]) {
    const { gl } = this;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);

    for (const pass of passes) {
      const program = this.programs.get(pass.moduleType);
      if (!program) continue;
      gl.useProgram(program);

      const isOutput = pass.moduleType === VideoModuleType.Output;
      gl.bindFramebuffer(gl.FRAMEBUFFER, isOutput ? null : this.target(pass.moduleId).framebuffer);

      let unit = 0;
      for (const [ioName, sourceId] of Object.entries(pass.inputs)) {
        const texture = sourceId === null ? this.black : this.target(sourceId).texture;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, `u_${ioName}`), unit);
        unit += 1;
      }

      for (const [name, value] of Object.entries(pass.uniforms)) {
        gl.uniform1f(gl.getUniformLocation(program, `u_${name}`), value);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  dispose() {
    this.disposeTargets();
    for (const program of this.programs.values()) this.gl.deleteProgram(program);
    this.programs.clear();
    this.gl.deleteTexture(this.black);
  }

  private setup() {
    const { gl } = this;
    this.programs.clear();
    this.targets.clear();
    gl.bindVertexArray(gl.createVertexArray());

    for (const [type, fragment] of Object.entries(FRAGMENT)) {
      this.programs.set(type as VideoModuleType, this.compile(fragment));
    }

    this.black = this.createTexture(1, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  }

  private compile(fragment: string): WebGLProgram {
    const { gl } = this;
    const program = gl.createProgram();
    for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Could not create shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed");
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed");
    }

    return program;
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  // One canvas-sized texture per non-output module, created on first use.
  private target(moduleId: string): Target {
    const existing = this.targets.get(moduleId);
    if (existing) return existing;

    const { gl } = this;
    const texture = this.createTexture(this.canvas.width, this.canvas.height);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const target = { texture, framebuffer };
    this.targets.set(moduleId, target);

    return target;
  }

  private disposeTargets() {
    for (const { texture, framebuffer } of this.targets.values()) {
      this.gl.deleteTexture(texture);
      this.gl.deleteFramebuffer(framebuffer);
    }
    this.targets.clear();
  }
}
```

Notes for the implementer:
- `gl.createProgram()`, `createTexture()`, `createFramebuffer()` return
  non-null in the current lib.dom typings. If tsc says they are nullable,
  add a null check that throws, as `compile` does for shaders.
- Targets for removed modules leak until the next resize. Add
  `// ponytail: targets outlive removed modules until resize; prune against the pass list if memory matters`
  above `target()`.

**Step 3: Write worker.ts**

```ts
import { handleMessage } from "./handleMessage";
import { HostMessage, WorkerMessage } from "./protocol";
import { Renderer } from "./render/Renderer";
import { VideoEngine } from "./VideoEngine";

const engine = new VideoEngine();
let renderer: Renderer | null = null;
let frameHandle = 0;

function post(message: WorkerMessage) {
  const transfer = message.type === "spectrumBuffer" ? [message.bins.buffer] : [];
  self.postMessage(message, { transfer });
}

function fail(error: unknown) {
  post({ type: "error", message: error instanceof Error ? error.message : String(error) });
}

function frame() {
  if (!renderer) return;
  try {
    renderer.render(engine.passes());
    frameHandle = requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
    detach();
  }
}

function detach() {
  cancelAnimationFrame(frameHandle);
  renderer?.dispose();
  renderer = null;
}

self.onmessage = (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "init":
        detach();
        renderer = new Renderer(message.canvas);
        renderer.resize(message.width, message.height);
        frameHandle = requestAnimationFrame(frame);
        post({ type: "ready" });
        return;
      case "resize":
        renderer?.resize(message.width, message.height);
        return;
      case "detach":
        detach();
        return;
      default:
        handleMessage(engine, message).forEach(post);
    }
  } catch (error) {
    fail(error);
  }
};
```

`self.postMessage(message, { transfer })` type-checks against the DOM
`Window.postMessage(message, options)` overload and is the worker global's
options form at runtime, so no WebWorker lib is needed in tsconfig.
`requestAnimationFrame` exists in dedicated workers in Chrome, Firefox and
Safari 16.4+.

**Step 4: Build and check**

Run: `pnpm build && pnpm tsc && pnpm lint && pnpm test --run`
Expected: `dist/index.js`, `dist/worker.js` and their `.d.ts` files exist;
all checks clean. Tests are unchanged and still pass.

**Step 5: Commit**

```bash
git add packages/video-engine
git commit -m "feat(video-engine): WebGL2 renderer and worker entry

Each pass draws a fullscreen triangle into a per-module texture; the
Output pass draws to the canvas. The worker owns the render loop and
pauses when the canvas is detached, keeping the graph alive for a
reopened projector window."
```

---

### Task 9: Host side: projector window and VideoEngineHost

**Files:**
- Create: `packages/video-engine/src/host/projectorWindow.ts`
- Create: `packages/video-engine/src/host/VideoEngineHost.ts`
- Create: `packages/video-engine/src/host/mirror.ts`
- Modify: `packages/video-engine/src/index.ts`
- Modify: `docs/findings.md` (create if missing)
- Test: `packages/video-engine/test/host/mirror.test.ts`

The window and worker plumbing are browser-only; the prop mirroring is a
pure function and gets a node test.

**Step 1: Write the failing mirror test**

`test/host/mirror.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { propsToControls } from "@/host/mirror";

describe("propsToControls", () => {
  it("names numeric props by module id and prop, skipping the rest", () => {
    expect(
      propsToControls("osc", { frequency: 440, wave: "sine", enabled: true, detune: 0 }),
    ).toEqual({ "patch:osc:frequency": 440, "patch:osc:detune": 0 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test --run test/host/mirror.test.ts`
Expected: FAIL, cannot resolve `@/host/mirror`.

**Step 3: Write mirror.ts**

```ts
// Structural view of the audio engine, so this package does not depend on
// @blibliki/engine: any object with these two members can be mirrored.
export type PatchSource = {
  serialize(): { modules: { id: string; props: object }[] };
  onPropsUpdate(callback: (update: { id: string; props: object }) => void): void;
};

export function propsToControls(moduleId: string, props: object): Record<string, number> {
  const controls: Record<string, number> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "number") controls[`patch:${moduleId}:${key}`] = value;
  }

  return controls;
}
```

**Step 4: Run the mirror test**

Run: `pnpm test --run test/host/mirror.test.ts`
Expected: PASS.

**Step 5: Write projectorWindow.ts**

```ts
export type ProjectorWindow = {
  window: Window;
  canvas: HTMLCanvasElement;
};

const PAGE = `<!doctype html><title>blibliki visuals</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;width:100%;height:100%}</style>
<canvas></canvas>`;

// Must be called from a user gesture or the browser blocks the popup.
// ponytail: manual placement plus click-to-fullscreen; the Window Management
// API can pick the projector screen automatically in Chrome, add when
// dragging the window over becomes a chore.
export function openProjectorWindow(): ProjectorWindow | null {
  const win = window.open("", "blibliki-visuals", "popup,width=1280,height=720");
  if (!win) return null;

  win.document.open();
  win.document.write(PAGE);
  win.document.close();

  const canvas = win.document.querySelector("canvas");
  if (!canvas) return null;

  canvas.addEventListener("click", () => {
    void canvas.requestFullscreen();
  });

  return { window: win, canvas };
}
```

**Step 6: Write VideoEngineHost.ts**

```ts
import { HostMessage, WorkerMessage } from "@/protocol";
import { IVideoPatch } from "@/VideoEngine";
import { PatchSource, propsToControls } from "./mirror";
import { openProjectorWindow, ProjectorWindow } from "./projectorWindow";

export type VideoEngineHostOptions = {
  patchSource: PatchSource;
  createWorker: () => Worker;
  // Returns the current frequency bins (dB) or undefined when no analyser is
  // in the patch. The array is copied before transfer, so returning the
  // analyser's own buffer is fine.
  readSpectrum?: () => Float32Array | undefined;
};

export class VideoEngineHost {
  private worker: Worker;
  private projector: ProjectorWindow | null = null;
  private spare: Float32Array | null = null;
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
      this.send({ type: "controls", values: propsToControls(update.id, update.props) });
    });
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
    const offscreen = canvas.transferControlToOffscreen();
    this.send(
      { type: "init", canvas: offscreen, width: win.innerWidth, height: win.innerHeight },
      [offscreen],
    );

    win.addEventListener("resize", () => {
      this.send({ type: "resize", width: win.innerWidth, height: win.innerHeight });
    });
    win.addEventListener("pagehide", () => {
      this.send({ type: "detach" });
      this.projector = null;
    });

    this.startSpectrum();

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
        this.patchListeners.forEach((l) => l(message.patch));
        return;
      case "error":
        this.errorListeners.forEach((l) => l(message.message));
        return;
      case "spectrumBuffer":
        this.spare = message.bins;
        return;
      case "ready":
        return;
    }
  }

  private startSpectrum() {
    cancelAnimationFrame(this.frameHandle);
    const { readSpectrum } = this.options;
    if (!readSpectrum) return;

    const tick = () => {
      if (this.disposed || !this.projector) return;
      const bins = readSpectrum();
      if (bins) {
        if (this.spare?.length !== bins.length) this.spare = new Float32Array(bins.length);
        const buffer = this.spare;
        this.spare = null;
        buffer.set(bins);
        this.send({ type: "spectrum", bins: buffer }, [buffer.buffer]);
      }
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }
}
```

One buffer is in flight at a time: the host copies the analyser's array
into `spare`, transfers it, and gets it back on `spectrumBuffer`. While it
is away, frames are skipped rather than allocated, so steady state is zero
allocation.

**Step 7: Export from index.ts and record the finding**

Add to `src/index.ts`:
```ts
export { VideoEngineHost } from "./host/VideoEngineHost";
export type { VideoEngineHostOptions } from "./host/VideoEngineHost";
export type { PatchSource } from "./host/mirror";
export { propsToControls } from "./host/mirror";
```

Append to `docs/findings.md` (create the file with a `# Findings` heading
if it does not exist):
```markdown
## Prop schema types are duplicated between engine and video-engine

`packages/video-engine/src/core/schema.ts` is a copy of
`packages/engine/src/core/schema.ts` so the video worker bundle does not
import Web Audio code. If both stay identical, move the types to
`@blibliki/utils` and import them from both packages.

## Engine has no way to remove an onPropsUpdate callback

`Engine.onPropsUpdate` pushes to an array with no remover, unlike
`onStateUpdate`. `VideoEngineHost` works around it with a disposed flag.
Add `removePropsUpdateCallback` to `packages/engine/src/Engine.ts`.
```

**Step 8: Run checks**

Run: `pnpm build && pnpm test --run && pnpm tsc && pnpm lint`
Expected: all clean.

**Step 9: Commit**

```bash
git add packages/video-engine docs/findings.md
git commit -m "feat(video-engine): host class and projector window

The host mirrors the audio engine's numeric props into named controls and
streams analyser bins with one transferred buffer in flight. It sees the
audio engine through a two-member structural type so the package has no
dependency on @blibliki/engine."
```

---

### Task 10: Grid wiring: a Visuals button in performance mode

**Files:**
- Modify: `apps/grid/package.json` (add `"@blibliki/video-engine": "workspace:^"` to dependencies)
- Create: `apps/grid/src/components/Instruments/VisualsButton.tsx`
- Modify: `apps/grid/src/components/Instruments/InstrumentPerformance.tsx`

**Step 1: Add the dependency**

In `apps/grid/package.json` dependencies, next to the other
`@blibliki/*` workspace entries, add:
```json
"@blibliki/video-engine": "workspace:^",
```
Run from the repo root: `pnpm install`.

**Step 2: Write VisualsButton.tsx**

```tsx
import { Engine, ModuleType } from "@blibliki/engine";
import { Button } from "@blibliki/ui";
import { VideoEngineHost, VideoModuleType } from "@blibliki/video-engine";
import VideoWorker from "@blibliki/video-engine/worker?worker";
import { useEffect, useRef } from "react";
import { useAppSelector } from "@/hooks";

// A source, a hue rotation driven by the low band, and the output. Enough to
// see the projector react; a real video patch editor replaces this.
function demoPatch() {
  return {
    modules: [
      { id: "src", name: "Source", moduleType: VideoModuleType.Source, props: { mode: "gradient" as const } },
      { id: "fx", name: "Hue", moduleType: VideoModuleType.HueRotate, props: {} },
      { id: "out", name: "Output", moduleType: VideoModuleType.Output, props: {} },
    ],
    routes: [
      { id: "r1", source: { moduleId: "src", ioName: "out" }, destination: { moduleId: "fx", ioName: "in" } },
      { id: "r2", source: { moduleId: "fx", ioName: "out" }, destination: { moduleId: "out", ioName: "in" } },
    ],
    bindings: [
      { id: "b1", moduleId: "fx", prop: "amount", control: "spectrum:low", inMin: 0, inMax: 1, outMin: 0, outMax: 360 },
    ],
  };
}

function readSpectrumFrom(engine: Engine) {
  return () => {
    for (const module of engine.modules.values()) {
      if (module.moduleType === ModuleType.Spectrum) {
        return (module as { getFrequencies(): Float32Array }).getFrequencies();
      }
    }
    return undefined;
  };
}

export default function VisualsButton() {
  const engineId = useAppSelector((state) => state.global.engineId);
  const hostRef = useRef<VideoEngineHost | null>(null);

  useEffect(() => () => hostRef.current?.dispose(), []);

  const open = () => {
    if (!engineId) return;
    if (!hostRef.current) {
      const engine = Engine.getById(engineId);
      const host = new VideoEngineHost({
        patchSource: engine,
        createWorker: () => new VideoWorker(),
        readSpectrum: readSpectrumFrom(engine),
      });
      host.onError((message) => console.error(`video engine: ${message}`));
      host.send({ type: "load", patch: demoPatch() });
      hostRef.current = host;
    }
    hostRef.current.open();
  };

  return (
    <Button variant="text" color="neutral" onClick={open}>
      Visuals
    </Button>
  );
}
```

Notes for the implementer:
- `engine.modules` is a public `Map` on `Engine`; `ModuleType.Spectrum`
  is exported from `@blibliki/engine`. Check `packages/engine/src/index.ts`
  for the `ModuleType` export name if the import fails.
- The `?worker` import is Vite's worker constructor import. If tsc does not
  know the `*?worker` module, add `/// <reference types="vite/client" />`
  to `apps/grid/src/vite-env.d.ts` (it is likely already there).
- If `patchSource: engine` fails to type-check against `PatchSource`, wrap
  it: `patchSource: { serialize: () => engine.serialize(), onPropsUpdate: (cb) => engine.onPropsUpdate(cb) }`.
- Match the Back button's classes from `InstrumentPerformance.tsx` if the
  header looks inconsistent; `@blibliki/ui`'s `Button` is the shared
  component, do not hand-roll one.

**Step 3: Add the button to the performance header**

In `apps/grid/src/components/Instruments/InstrumentPerformance.tsx`, import
`VisualsButton` and change `backSlot` from the single `Button` to a
fragment holding the existing Back button followed by `<VisualsButton />`.

**Step 4: Verify in the browser**

Run from the repo root: `pnpm build:packages`, then `pnpm dev`.

Open the grid, load a patch that contains a Spectrum module fed by the
audio path (add one from the module panel and route the synth output into
it if the patch has none), open an instrument's performance mode, click
Visuals.

Expected:
- A popup titled "blibliki visuals" opens with a horizontal hue gradient.
- Playing notes shifts the gradient's hue with the low band.
- Clicking the popup goes fullscreen; resizing keeps the gradient crisp.
- Closing the popup and clicking Visuals again reopens it with the same
  picture (the graph survived in the worker).
- The audio tab's main thread stays idle: open DevTools Performance on the
  audio tab for a few seconds and confirm no long tasks from the worker.

If the popup is blocked, the click was not treated as a gesture; check
that `open` runs synchronously inside the click handler.

**Step 5: Run the repo-wide checks**

Run from the repo root: `pnpm tsc && pnpm lint && pnpm test && pnpm format:check`
Expected: all clean across all workspaces.

**Step 6: Commit**

```bash
git add apps/grid pnpm-lock.yaml
git commit -m "feat(grid): Visuals button opens the video engine projector

Loads a fixed demo patch (gradient source, hue rotation bound to the low
band, output) so the projector can be exercised before there is a video
patch editor."
```

---

### Task 11: Docs and ADRs

**Files:**
- Create: `docs/adr/0001-video-engine-runs-in-a-worker.md`
- Create: `docs/adr/0002-audio-reaches-video-as-analyser-data.md`
- Create: `docs/adr/0003-video-renderer-is-raw-webgl2.md`
- Modify: `CLAUDE.md` (Repository Structure: add `video-engine/` under packages, one line; Package Dependencies: `utils → video-engine` alongside the existing chain)
- Modify: `docs/plans/2026-09-03-video-engine-design.md` (Status line to "implemented, see ADRs")

**Step 1: Write the three ADRs**

Each is short: Status, Context, Decision, Consequences, Alternatives
rejected. Lift the text from the matching Decisions subsection of the
design doc; do not restate the code.

`docs/adr/0001-video-engine-runs-in-a-worker.md` covers the worker plus the
dumb projector window (and why the projector window must stay dumb: it
shares the audio tab's main thread).

`docs/adr/0002-audio-reaches-video-as-analyser-data.md` covers analyser
bins over postMessage, BlackHole rejected, and the modulation gap that a
future "video send" module closes.

`docs/adr/0003-video-renderer-is-raw-webgl2.md` covers raw WebGL2, p5.js
rejected, three.js deferred until 3D is wanted, and that the renderer sits
behind the pure pass list so swapping it is contained.

**Step 2: Update CLAUDE.md and the design doc status**

Two lines in CLAUDE.md as listed above; one line in the design doc.

**Step 3: Run format check and commit**

Run from the repo root: `pnpm format:check`
Expected: clean.

```bash
git add docs/adr CLAUDE.md docs/plans/2026-09-03-video-engine-design.md
git commit -m "docs: ADRs for the video engine bootstrap

Records why the engine lives in a worker, why audio arrives as analyser
data, and why the renderer is raw WebGL2, with the alternatives rejected."
```

---

## Done when

- `pnpm tsc && pnpm lint && pnpm test && pnpm format:check` pass at the root.
- The browser check in Task 10 step 4 passes.
- Eleven commits on `feat/62-bootstrap-video-engine-package`, not pushed.
- `docs/findings.md` lists the two deferred items from Task 9.

Out of scope, each its own ticket later: camera and video-file sources, a
grid editor for video patches, the audio-side "video send" module, a
loopback audio input source module, Window Management API placement.
