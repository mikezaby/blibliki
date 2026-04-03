import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readDashboardSource() {
  return readFileSync(
    resolve(import.meta.dirname, "../ui/dashboard.slint"),
    "utf8",
  );
}

describe("dashboard header logo layout", () => {
  it("renders the Blibliki wordmark larger and without a framed badge", () => {
    const source = readDashboardSource();

    expect(source).toContain("width: compact-layout ? 156px : 220px;");
    expect(source).toContain("border-width: 0px;");
    expect(source).toContain("background: transparent;");
    expect(source).toContain("font-size: compact-layout ? 26px : 36px;");
  });

  it("lays out track and page horizontally and removes the unused mode badge", () => {
    const source = readDashboardSource();

    expect(source).toContain(`Rectangle {
                    background: transparent;
                    vertical-stretch: 1;

                    HorizontalLayout {`);
    expect(source).not.toContain(`VerticalLayout {
                    spacing: 4px;
                    alignment: start;`);
    expect(source).not.toContain("in-out property <string> mode-text");
    expect(source).not.toContain("text: mode-text;");
  });
});
