import { InstrumentPerformance } from "@blibliki/instrument/react";
import { Instrument, type IInstrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import InstrumentPicker from "./InstrumentPicker";
import { isFirebaseConfigured } from "./firebase";
import {
  clearInstrumentDraft,
  resolveInstrumentDocument,
  saveInstrumentDraft,
} from "./instrumentStore";

function loadInstruments() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "No Firebase config in this build — see apps/mobile/README.md",
    );
  }

  return Instrument.all();
}

export default function App() {
  const [selected, setSelected] = useState<IInstrument | null>(null);
  const load = useCallback(() => loadInstruments(), []);

  if (!selected) {
    return <InstrumentPicker load={load} onSelect={setSelected} />;
  }

  return (
    <InstrumentPerformance
      // Remounts on a different instrument, so the engine and controller
      // session are rebuilt rather than handed someone else's document.
      key={selected.id}
      name={selected.name}
      document={resolveInstrumentDocument(localStorage, selected)}
      // The installed app is already fullscreen and landscape-locked, so there
      // is nothing to toggle; the same build served in a mobile browser has
      // chrome worth escaping. Capacitor answers which one this is, so no user
      // agent is being guessed at.
      allowFullscreen={!Capacitor.isNativePlatform()}
      backSlot={
        <Button
          variant="text"
          color="neutral"
          onClick={() => {
            setSelected(null);
          }}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-4 font-mono uppercase tracking-[0.14em] text-zinc-200 hover:bg-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Instruments
        </Button>
      }
      // Read-only against Firestore: saving keeps the work on the device as a
      // draft rather than writing back to an instrument this app cannot
      // attribute to a user.
      onPersist={(action, nextDocument) => {
        if (action === "saveDraft") {
          saveInstrumentDraft(localStorage, selected.id, nextDocument);

          return {
            notice: {
              title: "SAVE COMPLETE",
              message: "Draft stored on device",
              tone: "success",
            },
          };
        }

        // Discard means the stored instrument wins again, so the device draft
        // is removed before reloading rather than being read back.
        clearInstrumentDraft(localStorage, selected.id);

        return {
          document: resolveInstrumentDocument(localStorage, selected),
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
