import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readMainSource() {
  return readFileSync(resolve(import.meta.dirname, "../src/main.ts"), "utf8");
}

describe("startup splash wiring", () => {
  it("keeps the splash visible for a minimum startup hold even when state arrives immediately", () => {
    const source = readMainSource();

    expect(source).toContain('const SPLASH_LOGO_TEXT = "Blibliki";');
    expect(source).toContain("const SPLASH_LETTER_INTERVAL_MS = 100;");
    expect(source).toContain(
      "let splashLetterInterval: ReturnType<typeof setInterval> | undefined;",
    );
    expect(source).toContain('window.splash_logo_text = "";');
    expect(source).toContain("setInterval(() => {");
    expect(source).toContain(
      "window.splash_logo_text = SPLASH_LOGO_TEXT.slice(0, revealedLetters);",
    );
    expect(source).toContain("clearInterval(splashLetterInterval);");
    expect(source).toContain("window.splash_visible = true;");
    expect(source).toContain("const MIN_STARTUP_SPLASH_MS = 1000;");
    expect(source).toContain(
      "let splashHideTimeout: ReturnType<typeof setTimeout> | undefined;",
    );
    expect(source).toContain("setTimeout(() => {");
    expect(source).toContain("}, remainingSplashMs);");
    expect(source).toContain("clearTimeout(splashHideTimeout);");
    expect(source).toContain("window.splash_visible = false;");
  });
});
