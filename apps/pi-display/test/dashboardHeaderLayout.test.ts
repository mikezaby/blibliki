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
    expect(source).toContain("padding: compact-layout ? 8px : 12px;");
    expect(source).not.toContain("padding: compact-layout ? 6px : 10px;");
    expect(source).toContain("x: compact-layout ? -2px : -3px;");
    expect(source).toContain("border-width: 0px;");
    expect(source).toContain("background: transparent;");
    expect(source).toContain("font-size: compact-layout ? 28px : 40px;");
  });

  it("lays out track and page horizontally and removes the unused mode badge", () => {
    const source = readDashboardSource();

    expect(source).toContain("background: transparent;");
    expect(source).toContain("vertical-stretch: 1;");
    expect(source).toContain("text: header-center;");
    expect(source).toContain("text: header-right;");
    expect(source).not.toContain(`VerticalLayout {
                    spacing: 4px;
                    alignment: start;`);
    expect(source).not.toContain("in-out property <string> mode-text");
    expect(source).not.toContain("text: mode-text;");
  });

  it("uses open parameter lanes instead of boxed cards", () => {
    const source = readDashboardSource();

    expect(source).toContain("background: transparent;");
    expect(source).toContain("border-width: 0px;");
    expect(source).toContain("font-size: compact ? 24px : 36px;");
    expect(source).toContain("font-size: compact ? 24px : 36px;");
    expect(source).toContain("in property <bool> accent-lane;");
    expect(source).toContain("height: 1px;");
    expect(source).not.toContain("background: empty ? #111111 : #0a0a0d;");
    expect(source).not.toContain("border-color: accent ? #ffb347 : #f2efe5;");
    expect(source).not.toContain("background: #101115;");
  });

  it("renders each slot with an arc-only encoder glyph", () => {
    const source = readDashboardSource();

    expect(source).toContain("arc-path: string");
    expect(source).toContain("Path {");
    expect(source).toContain("commands: arc-path;");
    expect(source).not.toContain("needle-path: string");
    expect(source).not.toContain("commands: needle-path;");
    expect(source).not.toContain("border-radius: compact ? 2px : 3px;");
    expect(source).not.toContain(
      "background: empty ? #1c2126 : accent ? #ffb347 : #f2efe5;",
    );
    expect(source).not.toContain("text: visual;");
  });

  it("lays out each slot as label then encoder then value inside an equal-width row", () => {
    const source = readDashboardSource();
    const labelIndex = source.indexOf("text: label;");
    const glyphIndex = source.indexOf("EncoderGlyph {");
    const valueIndex = source.indexOf("text: value;");

    expect(labelIndex).toBeGreaterThan(-1);
    expect(glyphIndex).toBeGreaterThan(labelIndex);
    expect(valueIndex).toBeGreaterThan(glyphIndex);
    expect(source).toContain("alignment: center;");
    expect(source).toContain("spacing: compact ? 7px : 10px;");
    expect(source).toContain("private property <int> visible-slot-count: 8;");
    expect(source).toContain(
      "private property <length> slot-gap: compact ? 10px : 14px;",
    );
    expect(source).toContain("private property <length> slot-width:");
    expect(source).toContain("width: slot-width;");
    expect(source).toContain("x: (parent.width - self.width) / 2;");
  });

  it("keeps discrete values centered below the top label without rendering an encoder", () => {
    const source = readDashboardSource();

    expect(source).toMatch(
      /component CellFrame inherits Rectangle \{[\s\S]*?VerticalLayout \{\n\s*alignment: start;/,
    );
    expect(source).toContain("show-encoder: bool");
    expect(source).toContain(`Rectangle {
            width: parent.width;
            height: label-height;
            background: transparent;
            border-width: 0px;

            Text {
                text: label;`);
    expect(source).toContain(`Rectangle {
            width: parent.width;
            vertical-stretch: 1;
            background: transparent;
            border-width: 0px;`);
    expect(source).toContain("private property <length> encoder-height:");
    expect(source).toContain("private property <length> label-height:");
    expect(source).toContain("private property <length> value-height:");
    expect(source).not.toContain(
      "private property <length> body-content-height:",
    );
    expect(source).toContain(`VerticalLayout {
                width: parent.width;
                height: parent.height;
                alignment: center;
                spacing: body-spacing;`);
    expect(source).toContain("if show-encoder : Rectangle");
    expect(source).not.toContain("if !show-encoder : Text");
    expect(source).not.toContain("visible: show-encoder;");
    expect(source).not.toContain("visible: !show-encoder;");
    expect(source).toContain("text: value;");
    expect(source).toContain("height: parent.height;");
    expect(source).toContain("height: value-height;");
    expect(source).toContain("vertical-alignment: center;");
  });

  it("shows a centered startup splash until real display state arrives", () => {
    const source = readDashboardSource();

    expect(source).toContain("in-out property <bool> splash-visible: true;");
    expect(source).toContain('in-out property <string> splash-logo-text: "";');
    expect(source).toContain("visible: splash-visible;");
    expect(source).toContain("text: splash-logo-text;");
    expect(source).toContain('text: "loading display";');
    expect(source).toContain("font-size: compact-layout ? 52px : 88px;");
  });
});
