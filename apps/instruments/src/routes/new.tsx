import { Instrument } from "@blibliki/models";
import { useClerk, useUser } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import NewInstrumentWizard from "../NewInstrumentWizard";
import { AccountButton, useFirebaseSession } from "../auth";
import {
  clearNewInstrumentDraft,
  loadNewInstrumentDraft,
  saveNewInstrumentDraft,
  startNewInstrumentDraft,
  type NewInstrumentDraft,
} from "../newInstrumentDraft";

type NewInstrumentSearch = {
  // Set by "Make it mine" on a recipe, to skip choosing one.
  recipe?: string;
};

export const Route = createFileRoute("/new")({
  // The wizard reads device storage and writes Firestore, browser only.
  ssr: false,
  validateSearch: (search): NewInstrumentSearch =>
    typeof search.recipe === "string" ? { recipe: search.recipe } : {},
  component: NewInstrumentPage,
});

function NewInstrumentPage() {
  const { recipe } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const ensureFirebaseSession = useFirebaseSession();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [draft, setDraft] = useState<NewInstrumentDraft | undefined>(
    () =>
      (recipe ? startNewInstrumentDraft(localStorage, recipe) : undefined) ??
      loadNewInstrumentDraft(sessionStorage),
  );

  useEffect(() => {
    if (draft) {
      saveNewInstrumentDraft(sessionStorage, draft);
    } else {
      clearNewInstrumentDraft(sessionStorage);
    }
  }, [draft]);

  // The recipe in the URL has done its job once the draft exists. Left there,
  // coming back from sign-in would start over from the recipe and drop the
  // name and every change made since.
  useEffect(() => {
    if (recipe) {
      void navigate({ to: "/new", search: {}, replace: true });
    }
  }, [navigate, recipe]);

  const create = async () => {
    if (!draft || !user) return;

    setCreating(true);
    setCreateError(undefined);

    try {
      await ensureFirebaseSession(user.id);

      const name = draft.name.trim();
      const instrument = new Instrument({
        name,
        userId: user.id,
        document: { ...draft.document, name },
      });
      await instrument.save();

      clearNewInstrumentDraft(sessionStorage);
      await navigate({
        to: "/instrument/$instrumentId",
        params: { instrumentId: instrument.id },
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : String(error));
      setCreating(false);
    }
  };

  return (
    <NewInstrumentWizard
      draft={draft}
      onDraftChange={setDraft}
      onPickRecipe={(recipeId) => {
        setDraft(startNewInstrumentDraft(localStorage, recipeId));
      }}
      isSignedIn={Boolean(user)}
      onSignIn={() => {
        openSignIn({ forceRedirectUrl: window.location.href });
      }}
      onCreate={() => {
        void create();
      }}
      creating={creating}
      createError={createError}
      actionSlot={<AccountButton />}
    />
  );
}
