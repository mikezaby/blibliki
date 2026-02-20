// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  join(process.cwd(), "src/components/Devices/index.tsx"),
  join(process.cwd(), "src/components/Devices/DeviceModal.tsx"),
];

describe("devices ui migration", () => {
  it("does not use inline style prop in Devices components", () => {
    const offenders = files.filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return /style=\{\{/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("does not use low-level theme helpers in Devices components", () => {
    const offenders = files.filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return /\b(uiVars|uiTone|uiColorMix)\b/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
