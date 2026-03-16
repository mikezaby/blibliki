import { LaunchControlXL3 } from "@blibliki/engine";
import assert from "node:assert/strict";
import test from "node:test";
import { PiLaunchControlXL3 } from "../src/runtime/PiLaunchControlXL3.ts";

test("reuses the generic LaunchControlXL3 controller base", () => {
  assert.equal(Object.getPrototypeOf(PiLaunchControlXL3), LaunchControlXL3);
});
