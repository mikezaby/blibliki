// @vitest-environment node
import { describe, expect, it } from "vitest";
import { shouldHandleGridClipboardTarget } from "../../src/components/Grid/gridClipboardShortcut";

describe("grid clipboard target guard", () => {
  it("allows clipboard handling for non-editable targets", () => {
    expect(shouldHandleGridClipboardTarget({ tagName: "DIV" })).toBe(true);
    expect(shouldHandleGridClipboardTarget(null)).toBe(true);
  });

  it("blocks clipboard handling for text inputs and editable content", () => {
    expect(shouldHandleGridClipboardTarget({ tagName: "INPUT" })).toBe(false);
    expect(shouldHandleGridClipboardTarget({ isContentEditable: true })).toBe(
      false,
    );
  });
});
