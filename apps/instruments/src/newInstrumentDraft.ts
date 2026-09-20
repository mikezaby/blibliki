import {
  findInstrumentRecipe,
  migrateInstrumentDocument,
  type InstrumentDocument,
} from "@blibliki/instrument";
import {
  resolveInstrumentDocument,
  type DeviceStorage,
} from "./instrumentStore";
import { findRecipeInstrument, recipeInstrumentId } from "./recipeInstrument";

const DRAFT_KEY = "blibliki.newInstrument";

// No draft means the wizard is still on its first step, choosing a recipe.
export type NewInstrumentDraft = {
  step: "structure" | "name";
  recipeId: string;
  name: string;
  document: InstrumentDocument;
};

// A visitor who tried the recipe in the console and changed it has a device
// draft under the recipe's id, and that is what they expect to keep.
export function startNewInstrumentDraft(
  deviceStorage: DeviceStorage,
  recipeId: string,
): NewInstrumentDraft | undefined {
  const recipeInstrument = findRecipeInstrument(
    recipeInstrumentId(recipeId),
    findInstrumentRecipe,
  );
  if (!recipeInstrument) {
    return undefined;
  }

  return {
    step: "structure",
    recipeId,
    name: recipeInstrument.name,
    document: resolveInstrumentDocument(deviceStorage, recipeInstrument),
  };
}

// Signing in can leave the page and come back (any OAuth provider does), so
// the draft is kept for the tab rather than only in component state.
export function saveNewInstrumentDraft(
  sessionStorage: DeviceStorage,
  draft: NewInstrumentDraft,
) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearNewInstrumentDraft(sessionStorage: DeviceStorage) {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function loadNewInstrumentDraft(
  sessionStorage: DeviceStorage,
): NewInstrumentDraft | undefined {
  const stored = sessionStorage.getItem(DRAFT_KEY);
  if (!stored) {
    return undefined;
  }

  try {
    const draft = JSON.parse(stored) as Partial<
      Record<keyof NewInstrumentDraft, unknown>
    >;
    if (typeof draft.recipeId !== "string" || typeof draft.name !== "string") {
      return undefined;
    }

    return {
      step: draft.step === "name" ? "name" : "structure",
      recipeId: draft.recipeId,
      name: draft.name,
      document: migrateInstrumentDocument(
        draft.document as Parameters<typeof migrateInstrumentDocument>[0],
      ),
    };
  } catch {
    return undefined;
  }
}
