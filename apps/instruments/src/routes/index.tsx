import { Instrument } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import InstrumentPicker from "../InstrumentPicker";
import { AccountButton } from "../auth";
import { isFirebaseConfigured } from "../firebase";
import { HEADER_PILL_CLASS } from "../headerPill";

export const Route = createFileRoute("/")({
  // Pages read Firestore and drive Web Audio, neither of which exists on the
  // server. A request that does reach the Worker gets the shell.
  ssr: false,
  component: IndexPage,
});

function loadInstruments() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "No Firebase config in this build. See apps/instruments/README.md",
    );
  }

  return Instrument.all();
}

function IndexPage() {
  const navigate = useNavigate();

  return (
    <InstrumentPicker
      load={loadInstruments}
      actionSlot={
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="text"
            color="neutral"
            className={HEADER_PILL_CLASS}
          >
            <Link to="/new">
              <Plus className="h-4 w-4" />
              New instrument
            </Link>
          </Button>
          <AccountButton />
        </div>
      }
      onSelect={(instrument) => {
        void navigate({
          to: "/instrument/$instrumentId",
          params: { instrumentId: instrument.id },
        });
      }}
    />
  );
}
