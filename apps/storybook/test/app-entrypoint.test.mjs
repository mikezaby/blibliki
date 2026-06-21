import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Storybook app entrypoint", () => {
  it("uses Storybook for the default development server", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(appDirectory, "package.json"), "utf8"),
    );

    assert.match(packageJson.scripts.dev, /^storybook dev(?:\s|$)/);
  });

  it("does not keep the Vite starter application", async () => {
    const starterFiles = [
      "index.html",
      "public/vite.svg",
      "src/App.css",
      "src/App.tsx",
      "src/assets/react.svg",
      "src/index.css",
      "src/main.tsx",
      "vite.config.ts",
    ];

    for (const file of starterFiles) {
      await assert.rejects(
        access(resolve(appDirectory, file), constants.F_OK),
        `${file} should be removed`,
      );
    }
  });
});
