import type { IPatch } from "@blibliki/models";
import defaultPatchDocument from "./defaultPatch.json";

// What a visitor lands on when they haven't picked a patch. It carries no id,
// so saving it writes a new patch of their own rather than overwriting this one.
export const DEFAULT_PATCH_ID = "default";

export const defaultPatch = defaultPatchDocument as unknown as Partial<IPatch>;
