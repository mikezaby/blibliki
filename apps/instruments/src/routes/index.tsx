import { Instrument } from "@blibliki/models";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import InstrumentPicker from "../InstrumentPicker";
import { AccountButton } from "../auth";
import { isFirebaseConfigured } from "../firebase";

export const Route = createFileRoute("/")({
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
      actionSlot={<AccountButton />}
      onSelect={(instrument) => {
        void navigate({
          to: "/instrument/$instrumentId",
          params: { instrumentId: instrument.id },
        });
      }}
    />
  );
}
