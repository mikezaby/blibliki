import { InstrumentPerformance } from "@blibliki/instrument/react";
import { Instrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  clearInstrumentDraft,
  resolveInstrumentDocument,
  saveInstrumentDraft,
} from "../instrumentStore";

export const Route = createFileRoute("/instrument/$instrumentId")({
  loader: async ({ params }) => {
    const instrument = await Instrument.find(params.instrumentId);
    return instrument.serialize();
  },
  component: InstrumentPage,
});

function InstrumentPage() {
  const instrument = Route.useLoaderData();

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
      // No login yet, so saving keeps the work on this device as a draft
      // rather than writing back to an instrument this app cannot attribute
      // to a user.
      onPersist={(action, nextDocument) => {
        if (action === "saveDraft") {
          saveInstrumentDraft(localStorage, instrument.id, nextDocument);

          return {
            notice: {
              title: "SAVE COMPLETE",
              message: "Draft stored on device",
              tone: "success",
            },
          };
        }

        clearInstrumentDraft(localStorage, instrument.id);

        return {
          document: resolveInstrumentDocument(localStorage, instrument),
          notice: {
            title: "DRAFT DISCARDED",
            message: "Reloaded from cloud",
            tone: "success",
          },
        };
      }}
    />
  );
}
