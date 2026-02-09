import { describe, expect, it } from "vitest";
import { shouldToggleTransportOnSpace } from "../../../src/components/layout/Header/transportKeyboardShortcut";

const keyboardEvent = (code: string, target: unknown, repeat = false) =>
  ({ code, target, repeat }) as KeyboardEvent;

describe("transport keyboard shortcut", () => {
  it("returns true for Space when not typing in input controls", () => {
    expect(
      shouldToggleTransportOnSpace(keyboardEvent("Space", { tagName: "DIV" })),
    ).toBe(true);
  });

  it("returns false for repeated keydown events", () => {
    expect(
      shouldToggleTransportOnSpace(
        keyboardEvent("Space", { tagName: "DIV" }, true),
      ),
    ).toBe(false);
  });

  it("returns false for input and textarea targets", () => {
    expect(
      shouldToggleTransportOnSpace(
        keyboardEvent("Space", { tagName: "INPUT" }),
      ),
    ).toBe(false);
    expect(
      shouldToggleTransportOnSpace(
        keyboardEvent("Space", { tagName: "TEXTAREA" }),
      ),
    ).toBe(false);
  });

  it("returns false for contenteditable targets", () => {
    expect(
      shouldToggleTransportOnSpace(
        keyboardEvent("Space", { isContentEditable: true }),
      ),
    ).toBe(false);
  });

  it("returns false for non-space keys", () => {
    expect(
      shouldToggleTransportOnSpace(keyboardEvent("Enter", { tagName: "DIV" })),
    ).toBe(false);
  });
});
