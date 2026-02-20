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

describe("grid component primitives", () => {
  it("does not use native textarea elements directly", () => {
    const files = listFiles(componentsRoot);

    const offenders = files
      .filter((filePath) => /<textarea\b/.test(readFileSync(filePath, "utf8")))
      .map((filePath) => relative(process.cwd(), filePath));

    expect(offenders).toEqual([]);
  });
});
