import assert from "node:assert/strict";
import test from "node:test";
import { resolveDisplayChildLaunch } from "../src/runtime/DisplayBridge.ts";

test("falls back to the TypeScript display child and preserves exec args in source mode", () => {
  const launch = resolveDisplayChildLaunch({
    importMetaUrl:
      "file:///Users/mikezaby/projects/blibliki/blibliki/packages/pi/src/runtime/DisplayBridge.ts",
    execPath: "/usr/local/bin/node",
    execArgv: ["--require", "/tmp/tsx-preflight.cjs", "--import", "/tmp/tsx-loader.mjs"],
    fileExists: (path) =>
      path.endsWith("/packages/pi/src/displayChild.ts"),
  });

  assert.equal(launch.command, "/usr/local/bin/node");
  assert.deepEqual(launch.args, [
    "--require",
    "/tmp/tsx-preflight.cjs",
    "--import",
    "/tmp/tsx-loader.mjs",
    "/Users/mikezaby/projects/blibliki/blibliki/packages/pi/src/displayChild.ts",
  ]);
});

test("uses the external display binary verbatim when configured", () => {
  const launch = resolveDisplayChildLaunch({
    importMetaUrl:
      "file:///Users/mikezaby/projects/blibliki/blibliki/packages/pi/src/runtime/DisplayBridge.ts",
    externalBinary: "/opt/blibliki/display",
    execPath: "/usr/local/bin/node",
    execArgv: ["--require", "/tmp/tsx-preflight.cjs"],
    fileExists: () => false,
  });

  assert.equal(launch.command, "/opt/blibliki/display");
  assert.deepEqual(launch.args, []);
});
