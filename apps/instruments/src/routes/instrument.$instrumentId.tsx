import { InstrumentPerformance } from "@blibliki/instrument/react";
import { Instrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { useUser } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { resolveInstrumentDocument } from "../instrumentStore";
import { persistInstrument } from "../persistInstrument";
import { loadInstrument } from "../recipeInstrument";

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
        <Button
          asChild
          variant="text"
          color="neutral"
          className="rounded-full border border-zinc-700 bg-zinc-950 px-4 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:bg-zinc-900"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Instruments
          </Link>
        </Button>
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
