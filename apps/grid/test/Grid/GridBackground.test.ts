// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const gridSourcePath = join(process.cwd(), "src/components/Grid/index.tsx");
const gridCanvasThemePath = join(process.cwd(), "src/theme/gridCanvas.ts");
const appStylesPath = join(process.cwd(), "src/styles/app.css");

describe("Grid background visibility", () => {
  it("uses semantic canvas variables for React Flow background and pattern", () => {
    const source = readFileSync(gridSourcePath, "utf8");
    const themeSource = readFileSync(gridCanvasThemePath, "utf8");

    expect(source).toContain("bgColor={GRID_CANVAS_BACKGROUND}");
    expect(source).toContain("color={GRID_CANVAS_PATTERN}");
    expect(themeSource).toContain('"var(--grid-canvas-background)"');
    expect(themeSource).toContain('"var(--grid-canvas-pattern)"');
  });

  it("keeps dark-mode canvas visibly lighter with stronger pattern contrast", () => {
    const stylesSource = readFileSync(appStylesPath, "utf8");

    expect(stylesSource).toContain(".dark .grid-container");
    expect(stylesSource).toContain("var(--ui-color-surface-1)");
    expect(stylesSource).toContain("var(--ui-color-text-primary) 12%");
    expect(stylesSource).toContain("var(--ui-color-text-primary) 32%");
  });
});
