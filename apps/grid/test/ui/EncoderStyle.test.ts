// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const uiStylesPath = join(process.cwd(), "../../packages/ui/styles.css");

function readEncoderStyles() {
  const styles = readFileSync(uiStylesPath, "utf8");
  const start = styles.indexOf("  .ui-encoder {");
  const end = styles.indexOf("  .ui-fader {", start);

  return styles.slice(start, end);
}

describe("Encoder visual style", () => {
  it("uses a flat control treatment with only one functional progress gradient", () => {
    const styles = readEncoderStyles();

    expect(styles).not.toContain("radial-gradient");
    expect(styles).not.toContain("linear-gradient");
    expect(styles).not.toContain("box-shadow");
    expect(styles).not.toContain("translateY");
    expect(styles.match(/conic-gradient/g)).toHaveLength(1);
  });

  it("anchors the indicator base at the center of the dial", () => {
    const styles = readEncoderStyles();

    expect(styles).toContain(
      "transform: translate(-50%, -100%) rotate(var(--ui-encoder-angle));",
    );
    expect(styles).toContain("transform-origin: center bottom;");
  });
});
