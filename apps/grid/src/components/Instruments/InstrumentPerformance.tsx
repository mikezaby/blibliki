import type { InstrumentDocument } from "@blibliki/instrument";
import { InstrumentPerformance as PerformanceConsole } from "@blibliki/instrument/react";
import { Instrument, type IInstrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import VisualsButton from "./VisualsButton";

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
        <>
          <Button
            asChild
            variant="text"
            color="neutral"
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:bg-zinc-900"
          >
            <Link
              to="/instrument/$instrumentId"
              params={{ instrumentId: instrument.id }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Editor
            </Link>
          </Button>
          <VisualsButton />
        </>
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
