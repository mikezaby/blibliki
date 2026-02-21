// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getIOToneClasses,
  getNodeContainerClassName,
} from "../../src/components/Grid/AudioNode";

const audioNodeSourcePath = join(
  process.cwd(),
  "src/components/Grid/AudioNode.tsx",
);
const appStylesPath = join(process.cwd(), "src/styles/app.css");

describe("AudioNode selected visibility", () => {
  it("applies prominent semantic highlight classes when selected", () => {
    const className = getNodeContainerClassName(true);

    expect(className).toContain("ring-4");
    expect(className).toContain("border-info");
    expect(className).toContain("shadow-2xl");
  });

  it("keeps neutral semantic border styles when not selected", () => {
    const className = getNodeContainerClassName(false);

    expect(className).toContain("border-border-subtle");
    expect(className).not.toContain("border-info");
    expect(className).not.toContain("ring-4");
  });

  it("maps audio and midi IOs to explicit semantic classes", () => {
    expect(getIOToneClasses("AudioInput")).toEqual({
      tone: "audio",
      handleToneClass: "io-handle--audio",
      indicatorToneClass: "io-indicator--audio",
      labelToneClass: "io-label--audio",
    });

    expect(getIOToneClasses("MidiOutput")).toEqual({
      tone: "midi",
      handleToneClass: "io-handle--midi",
      indicatorToneClass: "io-indicator--midi",
      labelToneClass: "io-label--midi",
    });
  });

  it("does not use gradient styling in AudioNode component", () => {
    const source = readFileSync(audioNodeSourcePath, "utf8");

    expect(source).not.toContain("bg-linear-to");
    expect(source).not.toContain("from-brand");
    expect(source).not.toContain("to-brand");
  });

  it("does not add extra outer border ring to midi handle", () => {
    const styles = readFileSync(appStylesPath, "utf8");

    expect(styles).not.toContain(
      "0 0 0 1px color-mix(in oklab, var(--ui-color-info-500), transparent 55%)",
    );
  });

  it("uses semantic token for selected edge stroke color", () => {
    const styles = readFileSync(appStylesPath, "utf8");

    expect(styles).toContain("stroke: var(--ui-color-info-500) !important;");
    expect(styles).not.toContain("#6793c6");
  });

  it("uses primary for audio IO and secondary for midi IO", () => {
    const styles = readFileSync(appStylesPath, "utf8");

    expect(styles).toContain(
      ".io-handle--audio {\n  background: var(--ui-color-primary-500);",
    );
    expect(styles).toContain(
      ".io-handle--midi {\n  background: var(--ui-color-secondary-500);",
    );
    expect(styles).toContain("var(--ui-color-secondary-600)");
    expect(styles).not.toContain(
      ".io-handle--midi {\n  background: var(--ui-color-info-500);",
    );
  });
});
