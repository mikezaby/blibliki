// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const gridSourcePath = join(process.cwd(), "src/components/Grid/index.tsx");

describe("grid system clipboard wiring", () => {
  it("uses browser copy and paste events instead of tab-local keydown clipboard handling", () => {
    const source = readFileSync(gridSourcePath, "utf8");

    expect(source).toContain(
      'window.addEventListener("copy", handleWindowCopy)',
    );
    expect(source).toContain(
      'window.addEventListener("paste", handleWindowPaste)',
    );
    expect(source).not.toContain(
      'window.addEventListener("keydown", handleWindowKeyDown)',
    );
  });
});
