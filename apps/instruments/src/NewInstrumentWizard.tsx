import { instrumentRecipes } from "@blibliki/instrument";
import { Button, Input, Label, Stack, Surface, Text } from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useId, type ReactNode } from "react";
import InstrumentStructureEditor from "./InstrumentStructureEditor";
import { HEADER_PILL_CLASS } from "./headerPill";
import type { NewInstrumentDraft } from "./newInstrumentDraft";
import { recipeInstrumentId } from "./recipeInstrument";
import { soundingTrackLabels, summarizeDocument } from "./structureLabels";

export type NewInstrumentWizardProps = {
  // No draft is the first step: choosing a recipe.
  draft: NewInstrumentDraft | undefined;
  onDraftChange: (draft: NewInstrumentDraft | undefined) => void;
  onPickRecipe: (recipeId: string) => void;
  isSignedIn: boolean;
  onSignIn: () => void;
  onCreate: () => void;
  creating: boolean;
  createError?: string;
  // Rendered beside the title, for whatever the host puts there.
  actionSlot?: ReactNode;
};

const STEP_NUMBER = { recipe: 1, structure: 2, name: 3 } as const;
const HINT_CLASS =
  "font-mono text-xs uppercase tracking-[0.14em] text-zinc-500";

function WizardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-3">
      {children}
    </div>
  );
}

function RecipeStep({
  onPickRecipe,
}: Pick<NewInstrumentWizardProps, "onPickRecipe">) {
  return (
    <ul className="flex flex-col gap-2">
      {instrumentRecipes.map((recipe) => (
        <li
          key={recipe.id}
          className="flex flex-col gap-3 rounded-2xl bg-zinc-900/40 px-4 py-4"
        >
          <Stack gap={1}>
            <Text asChild className="font-mono text-base text-zinc-100">
              <h2>{recipe.title}</h2>
            </Text>
            <Text size="sm" tone="secondary">
              {recipe.description}
            </Text>
            <Text className={HINT_CLASS}>
              {summarizeDocument(recipe.document)}
            </Text>
          </Stack>
          <Stack direction="row" gap={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                onPickRecipe(recipe.id);
              }}
            >
              Use this
            </Button>
            {soundingTrackLabels(recipe.document).length > 0 ? (
              <Button asChild variant="text" color="neutral">
                <Link
                  to="/instrument/$instrumentId"
                  params={{ instrumentId: recipeInstrumentId(recipe.id) }}
                >
                  Try it first
                </Link>
              </Button>
            ) : null}
          </Stack>
        </li>
      ))}
    </ul>
  );
}

export default function NewInstrumentWizard({
  draft,
  onDraftChange,
  onPickRecipe,
  isSignedIn,
  onSignIn,
  onCreate,
  creating,
  createError,
  actionSlot,
}: NewInstrumentWizardProps) {
  const nameId = useId();
  const step = draft?.step ?? "recipe";
  const canCreate = Boolean(draft?.name.trim()) && !creating;

  return (
    <Surface
      tone="canvas"
      data-theme="dark"
      className="fixed inset-0 overflow-y-auto bg-zinc-950 px-5 pt-6"
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Stack gap={1}>
            <Text
              asChild
              weight="semibold"
              className="block font-mono text-lg uppercase tracking-[0.22em] text-zinc-300"
            >
              <h1>New instrument</h1>
            </Text>
            <Text className={HINT_CLASS}>Step {STEP_NUMBER[step]} of 3</Text>
          </Stack>
          <Stack direction="row" align="center" gap={2}>
            <Button
              asChild
              variant="text"
              color="neutral"
              className={HEADER_PILL_CLASS}
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Instruments
              </Link>
            </Button>
            {actionSlot}
          </Stack>
        </div>

        {draft === undefined ? (
          <>
            <Text tone="secondary">
              Start from something that already plays. You can change every
              track in the next step.
            </Text>
            <RecipeStep onPickRecipe={onPickRecipe} />
          </>
        ) : null}

        {draft?.step === "structure" ? (
          <>
            <Text tone="secondary">
              Optional. Change what each track is, or continue if the recipe is
              already what you want. You shape the sound later, while you play.
            </Text>
            <InstrumentStructureEditor
              document={draft.document}
              onChange={(document) => {
                onDraftChange({ ...draft, document });
              }}
            />
            <div className="flex-1" />
            <WizardFooter>
              <Button
                variant="text"
                color="neutral"
                onClick={() => {
                  onDraftChange(undefined);
                }}
              >
                Recipes
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  onDraftChange({ ...draft, step: "name" });
                }}
              >
                Continue
              </Button>
            </WizardFooter>
          </>
        ) : null}

        {draft?.step === "name" ? (
          <form
            className="flex flex-1 flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canCreate) return;

              if (isSignedIn) {
                onCreate();
              } else {
                onSignIn();
              }
            }}
          >
            <Stack gap={2}>
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                value={draft.name}
                autoComplete="off"
                autoFocus
                onChange={(event) => {
                  onDraftChange({ ...draft, name: event.target.value });
                }}
              />
              <Text className={HINT_CLASS}>
                {summarizeDocument(draft.document)}
              </Text>
            </Stack>

            {isSignedIn ? null : (
              <Text tone="secondary">
                Sign in to keep this instrument. Everything you chose is still
                here when you come back.
              </Text>
            )}

            {createError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-4"
              >
                <Text className="font-mono text-sm uppercase tracking-[0.12em] text-red-100">
                  {createError}
                </Text>
              </div>
            ) : null}

            <div className="flex-1" />
            <WizardFooter>
              <Button
                variant="text"
                color="neutral"
                onClick={() => {
                  onDraftChange({ ...draft, step: "structure" });
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!canCreate}
              >
                {isSignedIn
                  ? creating
                    ? "Creating…"
                    : "Create instrument"
                  : "Sign in to create"}
              </Button>
            </WizardFooter>
          </form>
        ) : null}
      </div>
    </Surface>
  );
}
