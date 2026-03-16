import { createFileRoute } from "@tanstack/react-router";
import InstrumentEditor from "@/components/Instrument";

export const Route = createFileRoute("/instruments/$instrumentId")({
  component: InstrumentPage,
});

function InstrumentPage() {
  const { instrumentId } = Route.useParams();
  return <InstrumentEditor instrumentId={instrumentId} />;
}
