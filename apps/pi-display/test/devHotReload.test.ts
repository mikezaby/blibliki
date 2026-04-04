import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readPackageJson() {
  return JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
  ) as {
    scripts?: Record<string, string>;
  };
}

function readDevSource() {
  return readFileSync(resolve(import.meta.dirname, "../src/dev.ts"), "utf8");
}

describe("pi-display hot reload dev runner", () => {
  it("uses a dedicated dev script instead of launching main.ts directly", () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.dev).toBe("tsx src/dev.ts");
  });

  it("watches the display source and ui folders and restarts main.ts", () => {
    const source = readDevSource();

    expect(source).toContain(
      'const mainEntryPath = resolve(currentDir, "main.ts");',
    );
    expect(source).toContain(
      'const watchPaths = [currentDir, resolve(currentDir, "../ui")];',
    );
    expect(source).toContain(
      'spawn(process.execPath, ["--import", "tsx", mainEntryPath],',
    );
    expect(source).toContain("watch(watchPath, () => {");
    expect(source).toContain('childProcess.kill("SIGTERM");');
  });
});
