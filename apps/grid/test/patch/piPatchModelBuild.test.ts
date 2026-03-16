// @vitest-environment node
import { PiPatch } from "@blibliki/models";
import { createDefaultPiPatcherDocument } from "@blibliki/pi-patcher";
import { describe, expect, it } from "vitest";

describe("PiPatch.build", () => {
  it("creates a patch with bootstrap defaults", () => {
    const patch = PiPatch.build({
      document: createDefaultPiPatcherDocument(),
    });

    expect(patch.id).toBe("");
    expect(patch.name).toBe("Untitled");
    expect(patch.userId).toBe("");
    expect(patch.document.tracks).toHaveLength(8);
  });
});
