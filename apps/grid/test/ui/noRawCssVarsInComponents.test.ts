// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const componentsRoot = join(process.cwd(), "src/components");

function listFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      return listFiles(entryPath);
    }

    if (!entry.isFile()) {
      return [];
    }

    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
      return [];
    }

    return [entryPath];
  });
}

describe("grid component styling", () => {
  it("does not use raw CSS custom properties in component source", () => {
    const files = listFiles(componentsRoot);

    const offenders = files.flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const matches = Array.from(source.matchAll(/var\(--[^)]+\)/g));

      if (matches.length === 0) {
        return [];
      }

      const uniqueMatches = Array.from(
        new Set(matches.map((match) => match[0])),
      );
      return [
        `${relative(process.cwd(), filePath)} => ${uniqueMatches.join(", ")}`,
      ];
    });

    expect(offenders).toEqual([]);
  });
});
