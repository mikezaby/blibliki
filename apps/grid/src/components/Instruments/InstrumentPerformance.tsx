import type { InstrumentDocument } from "@blibliki/instrument";
import { InstrumentPerformance as PerformanceConsole } from "@blibliki/instrument/react";
import { Instrument, type IInstrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type InstrumentPerformanceProps = {
  instrument: IInstrument;
  onInstrumentChange?: (instrument: IInstrument) => void;
};

// Storage and routing live here; the console itself only knows documents.
export default function InstrumentPerformance({
  instrument,
  onInstrumentChange,
}: InstrumentPerformanceProps) {
  return (
    <PerformanceConsole
      name={instrument.name}
      document={instrument.document as InstrumentDocument}
      backSlot={
        <Button
          asChild
          variant="outlined"
          color="neutral"
          size="icon"
          aria-label="Back to Editor"
          className="rounded-full border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
        >
          <Link
            to="/instrument/$instrumentId"
            params={{ instrumentId: instrument.id }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      }
      onPersist={async (action, document) => {
        if (action === "saveDraft") {
          const nextInstrument = new Instrument({ ...instrument, document });
          await nextInstrument.save();
          onInstrumentChange?.(nextInstrument.serialize());

          return {
            notice: {
              title: "SAVE COMPLETE",
              message: "Firestore updated",
              tone: "success",
            },
          };
        }

        const remoteInstrument = await Instrument.find(instrument.id);
        onInstrumentChange?.(remoteInstrument.serialize());

        return {
          document: remoteInstrument.document as InstrumentDocument,
          notice: {
            title: "REMOTE RELOADED",
            message: "Local draft discarded",
            tone: "success",
          },
        };
      }}
    />
  );
}
