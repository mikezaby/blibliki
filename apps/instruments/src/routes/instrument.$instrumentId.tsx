import { InstrumentPerformance } from "@blibliki/instrument/react";
import { Instrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { useUser } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { HEADER_PILL_CLASS } from "../headerPill";
import { resolveInstrumentDocument } from "../instrumentStore";
import { persistInstrument } from "../persistInstrument";
import {
  isRecipeInstrumentId,
  loadInstrument,
  recipeIdOf,
} from "../recipeInstrument";

async function findRemote(instrumentId: string) {
  return (await Instrument.find(instrumentId)).serialize();
}

function loadRemote(instrumentId: string) {
  return loadInstrument(instrumentId, findRemote);
}

export const Route = createFileRoute("/instrument/$instrumentId")({
  // The loader reads Firestore, which is only initialized in the browser.
  ssr: false,
  loader: ({ params }) => loadRemote(params.instrumentId),
  component: InstrumentPage,
});

async function saveRemote(
  instrument: ReturnType<Instrument["serialize"]>,
  document: Parameters<typeof persistInstrument>[3],
) {
  await new Instrument({ ...instrument, document }).save();
}

function InstrumentPage() {
  const instrument = Route.useLoaderData();
  const { user } = useUser();

  return (
    <InstrumentPerformance
      // Remounts on a different instrument, so the engine and controller
      // session are rebuilt rather than handed someone else's document.
      key={instrument.id}
      name={instrument.name}
      document={resolveInstrumentDocument(localStorage, instrument)}
      allowFullscreen
      backSlot={
        <>
          <Button
            asChild
            variant="outlined"
            color="neutral"
            size="icon"
            aria-label="Instruments"
            className="rounded-full border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {isRecipeInstrumentId(instrument.id) ? (
            <Button
              asChild
              variant="text"
              color="neutral"
              className={HEADER_PILL_CLASS}
            >
              <Link to="/new" search={{ recipe: recipeIdOf(instrument.id) }}>
                <Plus className="h-4 w-4" />
                Make it mine
              </Link>
            </Button>
          ) : null}
        </>
      }
      onPersist={(action, nextDocument) =>
        persistInstrument(
          { storage: localStorage, userId: user?.id, saveRemote, loadRemote },
          instrument,
          action,
          nextDocument,
        )
      }
    />
  );
}
