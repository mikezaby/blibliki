// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  join(process.cwd(), "src/components/layout/Header/FileMenu/LoadModal.tsx"),
  join(process.cwd(), "src/components/Notification/NotificationItem.tsx"),
  join(
    process.cwd(),
    "src/components/AudioModule/StepSequencer/PageNavigator.tsx",
  ),
];

describe("grid ui migration hotspots", () => {
  it("does not use inline style prop in selected components", () => {
    const offenders = files.filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return /style=\{\{/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("does not use low-level theme helpers in selected components", () => {
    const offenders = files.filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return /\b(uiVars|uiTone|uiColorMix)\b/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
