// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(process.cwd(), "src");
const LEGACY_ALIAS_IMPORT_PATTERN =
  /from\s+["']@\/components\/ui(?:\/[^"']*)?["']/;
const LEGACY_RELATIVE_IMPORT_PATTERN =
  /from\s+["'](?:\.\.\/|\.\/)+ui(?:\/[^"']*)?["']/;

function collectSourceFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("ui-system import boundaries", () => {
  it("does not import legacy UI wrappers outside compatibility layer", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SOURCE_ROOT)) {
      const relativePath = relative(SOURCE_ROOT, file).replaceAll("\\", "/");

      if (relativePath.startsWith("components/ui/")) {
        continue;
      }

      const source = readFileSync(file, "utf8");

      if (
        LEGACY_ALIAS_IMPORT_PATTERN.test(source) ||
        LEGACY_RELATIVE_IMPORT_PATTERN.test(source)
      ) {
        offenders.push(relativePath);
      }
    }

    expect(offenders).toEqual([]);
  });
});
